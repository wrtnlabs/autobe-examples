import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postPoliticsBbsMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IPoliticsBbsComment.ICreate;
}): Promise<IPoliticsBbsComment> {
  const { member, articleId, body } = props;

  // Validate article exists
  const article = await MyGlobal.prisma.politics_bbs_articles.findUnique({
    where: { id: articleId },
    select: { id: true, deleted_at: true },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.deleted_at) {
    throw new HttpException("Article has been deleted", 410);
  }

  let depth = 0;
  let parentComment = null;

  // Handle parent comment for threading
  if (body.parent_id !== undefined && body.parent_id !== null) {
    parentComment = await MyGlobal.prisma.politics_bbs_comments.findUnique({
      where: {
        id: body.parent_id,
        politics_bbs_article_id: articleId,
      },
      select: { id: true, depth: true, deleted_at: true },
    });

    if (!parentComment) {
      throw new HttpException("Parent comment not found", 404);
    }

    if (parentComment.deleted_at) {
      throw new HttpException("Parent comment has been deleted", 410);
    }

    // Calculate new depth (max 3 levels)
    depth = parentComment.depth + 1;
    if (depth > 3) {
      throw new HttpException(
        "Maximum nesting depth of 3 levels exceeded",
        400,
      );
    }
  }

  // Create comment using relation connect instead of direct foreign key
  const comment = await MyGlobal.prisma.politics_bbs_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      article: { connect: { id: articleId } }, // Using relation connect instead of foreign key field
      parent: body.parent_id ? { connect: { id: body.parent_id } } : undefined, // Using relation connect for parent
      content: body.content,
      depth: depth as number & tags.Type<"int32">,
      status: "pending",
      actor_type: "member",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    } satisfies Prisma.politics_bbs_commentsCreateInput,
  });

  // Create member subtype relationship using proper field names
  await MyGlobal.prisma.politics_bbs_comment_of_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      comment: { connect: { id: comment.id } }, // Using relation connect instead of foreign key field
      member: { connect: { id: member.id } }, // Using relation connect instead of foreign key field
      created_at: toISOStringSafe(new Date()),
    } satisfies Prisma.politics_bbs_comment_of_membersCreateInput,
  });

  return {
    id: comment.id,
    politics_bbs_article_id: comment.politics_bbs_article_id,
    parent_id: comment.parent_id,
    content: comment.content,
    depth: comment.depth,
    status: comment.status,
    actor_type: comment.actor_type,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at !== null ? toISOStringSafe(comment.deleted_at) : null,
  };
}
