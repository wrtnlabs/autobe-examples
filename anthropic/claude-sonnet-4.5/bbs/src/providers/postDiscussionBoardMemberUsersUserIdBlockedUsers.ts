import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberUsersUserIdBlockedUsers(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBlockedUser.ICreate;
}): Promise<IDiscussionBoardBlockedUser> {
  const { member, userId, body } = props;

  // Authorization: Verify authenticated member matches userId parameter
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only manage blocks for your own account",
      403,
    );
  }

  // Self-blocking prevention
  if (userId === body.blocked_user_id) {
    throw new HttpException("Bad Request: You cannot block yourself", 400);
  }

  // Fetch blocker details (authenticated user)
  const blocker =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
      },
    });

  // Verify target user exists and is valid
  const blocked = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: body.blocked_user_id,
      deleted_at: null,
      account_status: "active",
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
    },
  });

  if (!blocked) {
    throw new HttpException(
      "Not Found: Target user does not exist or is not accessible",
      404,
    );
  }

  // Check if blocking relationship already exists using unique constraint
  const existingBlock =
    await MyGlobal.prisma.discussion_board_blocked_users.findUnique({
      where: {
        blocker_id_blocked_id: {
          blocker_id: userId,
          blocked_id: body.blocked_user_id,
        },
        deleted_at: null,
      },
    });

  if (existingBlock) {
    throw new HttpException(
      "Conflict: You have already blocked this user",
      409,
    );
  }

  // Enforce maximum 100 blocked users per account limit
  const currentBlockCount =
    await MyGlobal.prisma.discussion_board_blocked_users.count({
      where: {
        blocker_id: userId,
        deleted_at: null,
      },
    });

  if (currentBlockCount >= 100) {
    throw new HttpException(
      "Bad Request: Maximum limit of 100 blocked users reached",
      400,
    );
  }

  // Create blocking relationship
  const now = toISOStringSafe(new Date());
  const blockId = v4();

  await MyGlobal.prisma.discussion_board_blocked_users.create({
    data: {
      id: blockId,
      blocker_id: userId,
      blocked_id: body.blocked_user_id,
      reason: body.reason ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Construct and return response
  return {
    id: blockId,
    blocker: {
      id: blocker.id,
      username: blocker.username,
      display_name: blocker.display_name,
      avatar_url: blocker.avatar_url,
    },
    blocked: {
      id: blocked.id,
      username: blocked.username,
      display_name: blocked.display_name,
      avatar_url: blocked.avatar_url,
    },
    reason: body.reason ?? null,
    created_at: now,
  };
}
