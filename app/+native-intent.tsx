export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  console.log("[CorporateDecoder] redirectSystemPath", { path });
  return "/";
}
