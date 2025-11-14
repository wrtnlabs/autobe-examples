import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putPoliticalForumModeratorPostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IPoliticalForumComment.IUpdate;
}): Promise<IPoliticalForumComment> {
  const comment = await MyGlobal.prisma.political_forum_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or not accessible", 404);
  }

  await MyGlobal.prisma.political_forum_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      body: props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return props.body;
}
