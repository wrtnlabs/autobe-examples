import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";

export async function patchPoliticalForumCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumComment> {
  const comment = await MyGlobal.prisma.political_forum_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  return comment.body;
}
