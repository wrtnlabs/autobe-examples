import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function getDiscussionBoardMemberUserMemberUsersMemberUserIdRestriction(props: {
  memberUser: MemberuserPayload;
  memberUserId: string;
}): Promise<IDiscussionBoardMemberuserRestriction> {
  // Enforce self-access: a member user may only read their own restriction
  if (props.memberUser.id !== props.memberUserId) {
    throw new HttpException(
      "Forbidden to read another member's restriction",
      403,
    );
  }

  // Load the member user record to build the summary DTO and ensure the account exists
  const member = await MyGlobal.prisma.discussion_board_memberusers.findFirst({
    where: {
      id: props.memberUserId,
      deleted_at: null,
    },
  });

  if (member === null) {
    throw new HttpException("Member user not found", 404);
  }

  // Try to load the current (or most recent) restriction for this member user
  const restriction =
    await MyGlobal.prisma.discussion_board_memberuser_restrictions.findFirst({
      where: {
        discussion_board_memberuser_id: props.memberUserId,
      },
      orderBy: {
        started_at: "desc",
      },
    });

  // Build the member user summary used in the DTO
  const memberSummary: IDiscussionBoardMemberuser.ISummary = {
    id: member.id,
    display_name: member.display_name,
    account_status: member.account_status,
    created_at: toISOStringSafe(member.created_at),
  };

  if (restriction === null) {
    // No explicit restriction row exists yet; synthesize a default "no restriction" view
    const nowIso = toISOStringSafe(new Date());

    return {
      id: v4(),
      restriction_level: "none",
      reason_category: "no_restriction",
      started_at: nowIso,
      ended_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      memberUser: memberSummary,
    };
  }

  return {
    id: restriction.id,
    restriction_level: restriction.restriction_level,
    reason_category: restriction.reason_category,
    started_at: toISOStringSafe(restriction.started_at),
    ended_at:
      restriction.ended_at !== null
        ? toISOStringSafe(restriction.ended_at)
        : null,
    created_at: toISOStringSafe(restriction.created_at),
    updated_at: toISOStringSafe(restriction.updated_at),
    memberUser: memberSummary,
  };
}
