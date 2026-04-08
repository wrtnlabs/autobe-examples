import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const member = await MyGlobal.prisma.ecommerce_mall_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      memberSessions: {
        some: {
          id: payload.session_id,
          expired_at: { gt: new Date() },
        },
      },
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}