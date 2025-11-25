import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconomicDiscussionMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionComment> {
  const comment = await MyGlobal.prisma.economic_discussion_comments.findFirst({
    where: {
      id: props.commentId,
      economic_discussion_article_id: props.articleId,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  return {
    id: comment.id,
    economic_discussion_article_id: comment.economic_discussion_article_id,
    economic_discussion_member_id: comment.economic_discussion_member_id,
    parent_id: comment.parent_id ?? undefined,
    content: comment.content,
    status: comment.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
