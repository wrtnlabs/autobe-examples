import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";

export async function getDiscussionBoardDiscussionBoardPostsDiscussionBoardPostId(props: {
  discussionBoardPostId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDiscussionBoardPost> {
  const { discussionBoardPostId } = props;
  try {
    const post = await MyGlobal.prisma.discussion_board_posts.findUniqueOrThrow(
      {
        where: { id: discussionBoardPostId },
        select: {
          id: true,
          category_id: true,
          member_id: true,
          title: true,
          body: true,
          post_status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

    return {
      id: post.id,
      category_id: post.category_id,
      member_id: post.member_id,
      title: post.title,
      body: post.body,
      post_status: post.post_status,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
      deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
    };
  } catch {
    throw new HttpException("Discussion board post not found", 404);
  }
}
