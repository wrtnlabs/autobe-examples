import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconomicDiscussionMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionMember> {
  const member = await MyGlobal.prisma.economic_discussion_members.findUnique({
    where: { id: props.memberId },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: member.id,
    username: member.username,
    email: member.email,
    email_verified: member.email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    reputation_score: member.reputation_score,
  };
}
