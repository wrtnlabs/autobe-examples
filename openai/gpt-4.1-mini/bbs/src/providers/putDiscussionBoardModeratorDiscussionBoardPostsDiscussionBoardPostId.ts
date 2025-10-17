import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorDiscussionBoardPostsDiscussionBoardPostId(props: {
  moderator: ModeratorPayload;
  discussionBoardPostId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardPost.IUpdate;
}): Promise<IDiscussionBoardDiscussionBoardPost> {
  const { moderator, discussionBoardPostId, body } = props;

  const existingPost = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: discussionBoardPostId },
  });

  if (!existingPost) {
    throw new HttpException("Discussion board post not found", 404);
  }

  // Moderator role has permission to update any post

  const updatedPost = await MyGlobal.prisma.discussion_board_posts.update({
    where: { id: discussionBoardPostId },
    data: {
      ...(body.category_id !== undefined && { category_id: body.category_id }),
      ...(body.member_id !== undefined && { member_id: body.member_id }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.post_status !== undefined && { post_status: body.post_status }),
      ...(body.created_at !== undefined && {
        created_at: toISOStringSafe(body.created_at),
      }),
      ...(body.updated_at !== undefined && {
        updated_at: toISOStringSafe(body.updated_at),
      }),
      ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
    },
  });

  return {
    id: updatedPost.id,
    category_id: updatedPost.category_id,
    member_id: updatedPost.member_id,
    title: updatedPost.title,
    body: updatedPost.body,
    post_status: updatedPost.post_status,
    created_at: toISOStringSafe(updatedPost.created_at),
    updated_at: toISOStringSafe(updatedPost.updated_at),
    deleted_at: updatedPost.deleted_at
      ? toISOStringSafe(updatedPost.deleted_at)
      : null,
  };
}
