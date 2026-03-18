import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  let payload: MemberPayload;
  try {
    payload = jwtAuthorize({ request }) as MemberPayload;
  } catch {
    throw new UnauthorizedException();
  }

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const member = await (MyGlobal.prisma as any).members?.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (member === null || member === undefined) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
