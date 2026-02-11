import { ForbiddenException  from "@nestjs/common";
import { MyGlobal  from "../../MyGlobal";
import { jwtAuthorize  from "./jwtAuthorize";
import { MemberPayload  from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string ;
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not a member`);
  }

  const member = await MyGlobal.prisma.community_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (member === null) {
    throw new ForbiddenException("User not found");
  }

  return payload;
