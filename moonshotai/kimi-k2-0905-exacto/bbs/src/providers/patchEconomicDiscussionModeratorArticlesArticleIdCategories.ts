import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { ICategoryCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategoryCode";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicDiscussionModeratorArticlesArticleIdCategories(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionArticle.ICategoriesUpdate;
}): Promise<IEconomicDiscussionArticle.ISummary> {
  // Validate article exists
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Start transaction for atomic category update
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Clear existing category associations
    await tx.economic_discussion_article_categories.deleteMany({
      where: { economic_discussion_article_id: props.articleId },
    });

    // Validate all category codes exist and are active
    let categories: IEconomicDiscussionCategories.ISummary[] = [];
    if (props.body.category_codes.length > 0) {
      const categoryEntities = await tx.economic_discussion_categories.findMany(
        {
          where: {
            code: { in: props.body.category_codes },
            is_active: true,
          },
        },
      );

      if (categoryEntities.length !== props.body.category_codes.length) {
        throw new HttpException("One or more category codes are invalid", 400);
      }

      categories = categoryEntities.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        display_order: c.display_order,
        is_active: c.is_active,
        article_count: c.article_count,
      }));

      // Create new category associations
      await tx.economic_discussion_article_categories.createMany({
        data: props.body.category_codes.map((code) => ({
          id: v4() as string & tags.Format<"uuid">,
          economic_discussion_article_id: props.articleId,
          economic_discussion_category_id: categoryEntities.find(
            (c) => c.code === code,
          )!.id,
          created_at: new Date(),
        })),
      });
    }

    // Get counts for attachments and comments
    const attachmentsCount = await tx.economic_discussion_attachments.count({
      where: { economic_discussion_article_id: props.articleId },
    });

    const commentsCount = await tx.economic_discussion_comments.count({
      where: { economic_discussion_article_id: props.articleId },
    });

    // Get author information based on foreign keys
    let memberAuthorSummary: IEconomicDiscussionMembers.ISummary | undefined;
    let moderatorAuthorSummary:
      | IEconomicDiscussionModerators.ISummary
      | undefined;

    if (article.economic_discussion_member_id) {
      const member = await tx.economic_discussion_members.findUnique({
        where: { id: article.economic_discussion_member_id },
      });
      if (member) {
        memberAuthorSummary = {
          id: member.id,
          username: member.username,
          email_verified: member.email_verified,
          reputation_score: member.reputation_score,
          created_at: toISOStringSafe(member.created_at),
        };
      }
    }

    if (article.economic_discussion_moderator_id) {
      const moderator = await tx.economic_discussion_moderators.findUnique({
        where: { id: article.economic_discussion_moderator_id },
      });
      if (moderator) {
        moderatorAuthorSummary = {
          id: moderator.id,
          username: moderator.username,
          moderation_level: moderator.moderation_level as
            | "standard"
            | "senior"
            | "admin",
          created_at: toISOStringSafe(moderator.created_at),
        };
      }
    }

    // Return the formatted response
    return {
      id: article.id,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      economic_discussion_member_id:
        article.economic_discussion_member_id ??
        ("" satisfies string & tags.Format<"uuid">),
      economic_discussion_moderator_id:
        article.economic_discussion_moderator_id ??
        ("" satisfies string & tags.Format<"uuid">),
      member_author: memberAuthorSummary,
      moderator_author: moderatorAuthorSummary,
      categories: categories,
      attachments_count: attachmentsCount,
      comments_count: commentsCount,
      status: article.status as "pending" | "approved" | "rejected",
    };
  });
}
