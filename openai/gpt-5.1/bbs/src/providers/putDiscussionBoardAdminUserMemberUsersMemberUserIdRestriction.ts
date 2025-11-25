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
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putDiscussionBoardAdminUserMemberUsersMemberUserIdRestriction(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberuserRestriction.IUpdate;
}): Promise<IDiscussionBoardMemberuserRestriction> {
  // Locate existing restriction by unique foreign key to the member user
  const existingRestriction =
    await MyGlobal.prisma.discussion_board_memberuser_restrictions.findFirst({
      where: {
        discussion_board_memberuser_id: props.memberUserId,
      },
    });

  if (existingRestriction === null) {
    throw new HttpException(
      "Restriction not found for the specified memberUserId. Use POST /discussionBoard/adminUser/memberUsers/{memberUserId}/restriction to create one first.",
      404,
    );
  }

  // Compute the effective started_at and ended_at values that will apply
  const effectiveStartedAt =
    props.body.started_at !== undefined
      ? props.body.started_at
      : toISOStringSafe(existingRestriction.started_at);

  const effectiveEndedAt =
    props.body.ended_at !== undefined
      ? props.body.ended_at
      : existingRestriction.ended_at === null
        ? null
        : toISOStringSafe(existingRestriction.ended_at);

  // Business validation: if both effective start and end exist, ensure ordering
  if (effectiveEndedAt !== null) {
    if (effectiveStartedAt > effectiveEndedAt) {
      throw new HttpException(
        "ended_at must be greater than or equal to started_at",
        400,
      );
    }
  }

  // Apply partial update; rely on DB or Prisma middleware to maintain updated_at
  const updatedRestriction =
    await MyGlobal.prisma.discussion_board_memberuser_restrictions.update({
      where: {
        id: existingRestriction.id,
      },
      data: {
        ...(props.body.restriction_level !== undefined && {
          restriction_level: props.body.restriction_level,
        }),
        ...(props.body.reason_category !== undefined && {
          reason_category: props.body.reason_category,
        }),
        ...(props.body.started_at !== undefined && {
          started_at: props.body.started_at,
        }),
        ...(props.body.ended_at !== undefined && {
          ended_at: props.body.ended_at,
        }),
      },
    });

  // Load member user summary for response embedding
  const memberUser =
    await MyGlobal.prisma.discussion_board_memberusers.findUnique({
      where: {
        id: updatedRestriction.discussion_board_memberuser_id,
      },
    });

  if (memberUser === null) {
    throw new HttpException("Member user not found for restriction", 404);
  }

  // Optional: ensure member user is in an allowed account state
  if (memberUser.account_status !== "active") {
    throw new HttpException(
      "Member user account is not in an updatable state for restrictions",
      400,
    );
  }

  const startedAt = toISOStringSafe(updatedRestriction.started_at);
  const createdAt = toISOStringSafe(updatedRestriction.created_at);
  const updatedAt = toISOStringSafe(updatedRestriction.updated_at);

  const endedAt =
    updatedRestriction.ended_at === null
      ? null
      : toISOStringSafe(updatedRestriction.ended_at);

  const memberUserCreatedAt = toISOStringSafe(memberUser.created_at);

  return {
    id: updatedRestriction.id,
    restriction_level: updatedRestriction.restriction_level,
    reason_category: updatedRestriction.reason_category,
    started_at: startedAt,
    ended_at: endedAt === null ? null : endedAt,
    created_at: createdAt,
    updated_at: updatedAt,
    memberUser: {
      id: memberUser.id,
      display_name: memberUser.display_name,
      account_status: memberUser.account_status,
      created_at: memberUserCreatedAt,
    },
  };
}
