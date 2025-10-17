import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFollowedTag";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberUsersUserIdFollowedTags(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardFollowedTag.ICreate;
}): Promise<IDiscussionBoardFollowedTag> {
  const { member, userId, body } = props;

  // Authorization: verify userId matches authenticated member
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only follow tags for your own account",
      403,
    );
  }

  // Check current followed tag count (50-tag maximum limit)
  const currentFollowCount =
    await MyGlobal.prisma.discussion_board_followed_tags.count({
      where: {
        discussion_board_member_id: member.id,
        deleted_at: null,
      },
    });

  if (currentFollowCount >= 50) {
    throw new HttpException(
      "Maximum followed tags limit reached (50 tags)",
      400,
    );
  }

  // Verify tag exists and is active
  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      id: body.discussion_board_tag_id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!tag) {
    throw new HttpException("Tag not found or not active", 404);
  }

  // Check for existing follow relationship (duplicate prevention)
  const existingFollow =
    await MyGlobal.prisma.discussion_board_followed_tags.findFirst({
      where: {
        discussion_board_member_id: member.id,
        discussion_board_tag_id: body.discussion_board_tag_id,
        deleted_at: null,
      },
    });

  if (existingFollow) {
    throw new HttpException("You are already following this tag", 400);
  }

  // Prepare timestamp once for consistency
  const timestamp = toISOStringSafe(new Date());

  // Create followed tag relationship
  const created = await MyGlobal.prisma.discussion_board_followed_tags.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: member.id,
      discussion_board_tag_id: body.discussion_board_tag_id,
      created_at: timestamp,
      updated_at: timestamp,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    discussion_board_member_id: created.discussion_board_member_id as string &
      tags.Format<"uuid">,
    discussion_board_tag_id: created.discussion_board_tag_id as string &
      tags.Format<"uuid">,
    created_at: timestamp,
    updated_at: timestamp,
  };
}
