import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsContent";
import { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putPoliticsBbsModeratorModeratorContentContentIdReject(props: {
  moderator: ModeratorPayload;
  contentId: string & tags.Format<"uuid">;
  body: IPoliticsBbsContent.IReject;
}): Promise<IPoliticsBbsContent.IRejectResponse> {
  const { moderator, contentId, body } = props;

  const processedAt = toISOStringSafe(new Date());

  // Try to find as article first
  const article = await MyGlobal.prisma.politics_bbs_articles.findFirst({
    where: { id: contentId },
    select: {
      id: true,
      state: true,
      title: true,
      content: true,
      view_count: true,
      created_at: true,
      category: {
        select: {
          id: true,
          code: true,
          name: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          sequence: true,
          primary: true,
          required: true,
          multiplicative: true,
          color: true,
          icon: true,
          description: true,
        },
      },
    },
  });

  if (article) {
    const updatedArticle = await MyGlobal.prisma.politics_bbs_articles.update({
      where: { id: contentId },
      data: { state: "rejected", updated_at: new Date() },
    });

    return {
      processedAt: processedAt,
      contentId: contentId,
      contentType: {
        id: updatedArticle.id,
        title: article.title,
        content: article.content,
        state: "rejected",
        view_count: article.view_count,
        created_at: toISOStringSafe(article.created_at),
        updated_at: processedAt,
        category: {
          id: article.category.id,
          code: article.category.code,
          name: article.category.name,
          created_at: toISOStringSafe(article.category.created_at),
          updated_at: article.category.updated_at
            ? toISOStringSafe(article.category.updated_at)
            : null,
          deleted_at: article.category.deleted_at
            ? toISOStringSafe(article.category.deleted_at)
            : null,
          sequence: article.category.sequence,
          primary: article.category.primary,
          required: article.category.required,
          multiplicative: article.category.multiplicative,
          color: article.category.color,
          icon: article.category.icon,
          description: article.category.description,
        },
      },
      creatorNotified: body.notifyCreator,
      moderatorId: moderator.id,
      newStatus: "rejected",
      previousStatus: article.state as
        | "pending"
        | "approved"
        | "flagged"
        | "draft",
      rejectionDetails: body,
    };
  }

  // Try to find as comment
  const comment = await MyGlobal.prisma.politics_bbs_comments.findFirst({
    where: { id: contentId },
    select: {
      id: true,
      politics_bbs_article_id: true,
      parent_id: true,
      content: true,
      depth: true,
      status: true,
      actor_type: true,
      created_at: true,
    },
  });

  if (!comment) {
    throw new HttpException("Content not found", 404);
  }

  await MyGlobal.prisma.politics_bbs_comments.update({
    where: { id: contentId },
    data: { status: "rejected", updated_at: new Date() },
  });

  return {
    processedAt: processedAt,
    contentId: contentId,
    contentType: {
      id: comment.id,
      politics_bbs_article_id: comment.politics_bbs_article_id,
      parent_id: comment.parent_id,
      content: comment.content,
      depth: comment.depth,
      status: "rejected",
      actor_type: comment.actor_type,
      created_at: toISOStringSafe(comment.created_at),
    },
    creatorNotified: body.notifyCreator,
    moderatorId: moderator.id,
    newStatus: "rejected",
    previousStatus: comment.status as
      | "pending"
      | "approved"
      | "flagged"
      | "draft",
    rejectionDetails: body,
  };
}
