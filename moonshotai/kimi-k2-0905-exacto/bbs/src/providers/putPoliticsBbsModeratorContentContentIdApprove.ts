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

export async function putPoliticsBbsModeratorContentContentIdApprove(props: {
  moderator: ModeratorPayload;
  contentId: string & tags.Format<"uuid">;
  body: IPoliticsBbsContentApproval.ICreate;
}): Promise<IPoliticsBbsContentApproval> {
  // Fetch moderator details for the response
  const moderatorRecord =
    await MyGlobal.prisma.politics_bbs_moderators.findUniqueOrThrow({
      where: {
        id: props.moderator.id,
        deleted_at: null,
      },
    });

  // Try to approve as article first
  const articleResult = await MyGlobal.prisma.politics_bbs_articles.findUnique({
    where: {
      id: props.contentId,
      deleted_at: null,
    },
  });

  if (articleResult) {
    if (articleResult.state !== "pending") {
      throw new HttpException(
        `Article is not in pending state (current: ${articleResult.state})`,
        400,
      );
    }

    const updatedArticle = await MyGlobal.prisma.politics_bbs_articles.update({
      where: { id: props.contentId },
      data: {
        state: "approved",
        updated_at: toISOStringSafe(new Date()),
      },
    });

    const category =
      await MyGlobal.prisma.politics_bbs_categories.findUniqueOrThrow({
        where: { id: updatedArticle.politics_bbs_category_id },
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
          id: category.id,
          code: category.code,
          name: category.name,
          created_at: toISOStringSafe(category.created_at),
          updated_at: category.updated_at
            ? toISOStringSafe(category.updated_at)
            : null,
          deleted_at: category.deleted_at
            ? toISOStringSafe(category.deleted_at)
            : null,
          sequence: category.sequence,
          primary: category.primary,
          required: category.required,
          multiplicative: category.multiplicative,
          color: category.color,
          icon: category.icon,
          description: category.description,
        },
      },
      moderator: {
        id: moderatorRecord.id,
        username: moderatorRecord.username,
        email: moderatorRecord.email,
        created_at: toISOStringSafe(moderatorRecord.created_at),
      },
      notes: props.body.notes,
      approvedAt: toISOStringSafe(new Date()),
    };
  }

  // Try to approve as comment
  const commentResult = await MyGlobal.prisma.politics_bbs_comments.findUnique({
    where: {
      id: props.contentId,
      deleted_at: null,
    },
  });

  if (commentResult) {
    if (commentResult.status !== "pending") {
      throw new HttpException(
        `Comment is not in pending status (current: ${commentResult.status})`,
        400,
      );
    }

    const updatedComment = await MyGlobal.prisma.politics_bbs_comments.update({
      where: { id: props.contentId },
      data: {
        status: "approved",
        updated_at: toISOStringSafe(new Date()),
      },
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
        id: moderatorRecord.id,
        username: moderatorRecord.username,
        email: moderatorRecord.email,
        created_at: toISOStringSafe(moderatorRecord.created_at),
      },
      notes: props.body.notes,
      approvedAt: toISOStringSafe(new Date()),
    };
  }

  throw new HttpException("Content item not found", 404);
}
