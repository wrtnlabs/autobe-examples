import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";

export async function getPoliticalForumPostsPostIdCommentsCommentId(props: {
  postId: string;
  commentId: string;
}): Promise<IPoliticalForumComment> {
  const comment = await MyGlobal.prisma.political_forum_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or inaccessible", 404);
  }

  return comment.body;
}
