import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { jwtAuthorize } from "./jwtAuthorize";
import { MyGlobal } from "../../MyGlobal";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  let payload: MemberPayload;

  try {
    payload = jwtAuthorize({ request }) as MemberPayload;
  } catch {
    throw new UnauthorizedException("Invalid or missing token");
  }

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const profile = await MyGlobal.prisma.multi_user_todo_user_profiles.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (profile === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
