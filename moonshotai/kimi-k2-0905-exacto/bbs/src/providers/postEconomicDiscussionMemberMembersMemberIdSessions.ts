import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";
import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconomicDiscussionMemberMembersMemberIdSessions(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionMemberSession.ICreate;
}): Promise<IEconomicDiscussionMemberSession> {
  // Verify authorization matches target member
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden - can only create sessions for your own account",
      403,
    );
  }

  // Get member details for response
  const member = await MyGlobal.prisma.economic_discussion_members.findUnique({
    where: { id: props.memberId },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Create session with proper defaults for optional fields
  const created =
    await MyGlobal.prisma.economic_discussion_member_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        economic_discussion_member_id: props.memberId,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer ?? null,
        created_at: new Date(),
        expired_at: null,
      },
    });

  return {
    id: created.id,
    member: {
      id: member.id,
      username: member.username,
      email: member.email,
    },
    ip: created.ip,
    href: created.href as string & tags.Format<"uri">,
    referrer: created.referrer ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    expired_at: created.expired_at
      ? toISOStringSafe(created.expired_at)
      : undefined,
  };
}
