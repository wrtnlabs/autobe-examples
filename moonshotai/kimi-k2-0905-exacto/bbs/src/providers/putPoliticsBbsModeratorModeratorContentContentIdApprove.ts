import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsContentApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsContentApproval";
import { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putPoliticsBbsModeratorModeratorContentContentIdApprove(props: {
  moderator: ModeratorPayload;
  contentId: string & tags.Format<"uuid">;
  body: IPoliticsBbsContentApproval.ICreate;
}): Promise<IPoliticsBbsContentApproval> {
  // First check if content exists as an article
  const article = await MyGlobal.prisma.politics_bbs_articles.findFirst({
    where: {
      id: props.contentId,
      deleted_at: null,
      state: "pending", // Only allow approval of pending content
    },
    include: {
      category: true,
    },
  });

  if (article) {
    const now = toISOStringSafe(new Date());

    // Update article to approved state
    const updatedArticle = await MyGlobal.prisma.politics_bbs_articles.update({
      where: { id: props.contentId },
      data: {
        state: "approved",
        updated_at: now,
      },
    });

    // Get moderator summary information
    const moderatorData =
      await MyGlobal.prisma.politics_bbs_moderators.findUniqueOrThrow({
        where: { id: props.moderator.id },
      });

    return {
      id: updatedArticle.id,
      state: "approved",
      contentType: {
        id: updatedArticle.id,
        title: updatedArticle.title,
        content: updatedArticle.content,
        state: updatedArticle.state,
        view_count: updatedArticle.view_count,
        created_at: toISOStringSafe(updatedArticle.created_at),
        updated_at: toISOStringSafe(updatedArticle.updated_at),
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
      moderator: {
        id: moderatorData.id,
        username: moderatorData.username,
        email: moderatorData.email,
        created_at: toISOStringSafe(moderatorData.created_at),
      },
      notes: props.body.notes,
      approvedAt: now,
    };
  }

  // If not found as article, check as comment
  const comment = await MyGlobal.prisma.politics_bbs_comments.findFirst({
    where: {
      id: props.contentId,
      deleted_at: null,
      status: "pending", // Only allow approval of pending content
    },
    include: {
      article: true,
    },
  });

  if (comment) {
    const now = toISOStringSafe(new Date());

    // Update comment to approved status
    const updatedComment = await MyGlobal.prisma.politics_bbs_comments.update({
      where: { id: props.contentId },
      data: {
        status: "approved",
        updated_at: now,
      },
    });

    // Get moderator summary information
    const moderatorData =
      await MyGlobal.prisma.politics_bbs_moderators.findUniqueOrThrow({
        where: { id: props.moderator.id },
      });

    return {
      id: updatedComment.id,
      state: "approved",
      contentType: {
        id: updatedComment.id,
        politics_bbs_article_id: updatedComment.politics_bbs_article_id,
        parent_id: updatedComment.parent_id
          ? updatedComment.parent_id
          : undefined,
        content: updatedComment.content,
        depth: updatedComment.depth,
        status: updatedComment.status,
        actor_type: updatedComment.actor_type,
        created_at: toISOStringSafe(updatedComment.created_at),
      },
      moderator: {
        id: moderatorData.id,
        username: moderatorData.username,
        email: moderatorData.email,
        created_at: toISOStringSafe(moderatorData.created_at),
      },
      notes: props.body.notes,
      approvedAt: now,
    };
  }

  throw new HttpException("Content not found or already processed", 404);
}
