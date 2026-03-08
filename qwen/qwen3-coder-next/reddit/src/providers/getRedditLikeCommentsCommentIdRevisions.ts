import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommentRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommentRevision";
import { IRedditLikeCommentRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentRevision";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommentsCommentIdRevisions(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeCommentRevision.ISummary> {
  const revisions =
    await MyGlobal.prisma.reddit_like_comment_revisions.findMany({
      where: {
        comment_id: props.commentId,
      },
      orderBy: {
        created_at: "asc",
      },
    });
  const data = revisions.map((revision) => ({
    id: revision.id,
    comment_id: revision.comment_id,
    content: revision.content,
    created_at: toISOStringSafe(revision.created_at),
  }));
  const total = revisions.length;
  return {
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: total > 0 ? 1 : 0,
    },
    data,
  };
}
