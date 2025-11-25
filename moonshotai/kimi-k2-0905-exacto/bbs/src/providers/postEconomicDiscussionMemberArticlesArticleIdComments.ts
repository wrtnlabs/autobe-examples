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

export async function postEconomicDiscussionMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionComment.ICreate;
}): Promise<IEconomicDiscussionComment> {
  // Verify article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Validate parent comment if provided
  if (props.body.parent_comment_id) {
    const parentComment =
      await MyGlobal.prisma.economic_discussion_comments.findUnique({
        where: { id: props.body.parent_comment_id },
      });

    if (!parentComment) {
      throw new HttpException("Parent comment not found", 404);
    }

    if (parentComment.economic_discussion_article_id !== props.articleId) {
      throw new HttpException(
        "Parent comment belongs to different article",
        400,
      );
    }
  }

  // Create comment with member attribution
  const comment = await MyGlobal.prisma.economic_discussion_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      economic_discussion_article_id: props.articleId,
      economic_discussion_member_id: props.member.id,
      content: props.body.content,
      parent_id: props.body.parent_comment_id,
      status: "pending",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: comment.id as string & tags.Format<"uuid">,
    economic_discussion_article_id:
      comment.economic_discussion_article_id as string & tags.Format<"uuid">,
    economic_discussion_member_id:
      comment.economic_discussion_member_id as string & tags.Format<"uuid">,
    parent_id: comment.parent_id as
      | (string & tags.Format<"uuid">)
      | null
      | undefined,
    content: comment.content,
    status: comment.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(comment.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(comment.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
