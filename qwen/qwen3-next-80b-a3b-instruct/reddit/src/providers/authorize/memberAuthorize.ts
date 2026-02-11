import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← Same directory!
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using appropriate field based on schema
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      id: payload.id, // Direct ID since member is primary actor
      deleted_at: null, // Soft-delete check
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}