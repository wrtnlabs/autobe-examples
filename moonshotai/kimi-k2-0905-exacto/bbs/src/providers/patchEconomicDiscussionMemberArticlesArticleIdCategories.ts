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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconomicDiscussionMemberArticlesArticleIdCategories(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionArticle.ICategoriesUpdate;
}): Promise<IEconomicDiscussionArticle.ISummary> {
  // Verify article exists and belongs to the member
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.economic_discussion_member_id !== props.member.id) {
    throw new HttpException(
      "You can only update categories for your own articles",
      403,
    );
  }

  // Validate all category codes exist and are active
  if (props.body.category_codes.length > 0) {
    const categories =
      await MyGlobal.prisma.economic_discussion_categories.findMany({
        where: {
          code: { in: props.body.category_codes },
          is_active: true,
        },
        select: { id: true, code: true },
      });

    if (categories.length !== props.body.category_codes.length) {
      throw new HttpException(
        "One or more category codes are invalid or inactive",
        400,
      );
    }
  }

  // Delete existing categories and create new ones in transaction
  const updatedArticle = await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing category associations
    await tx.economic_discussion_article_categories.deleteMany({
      where: { economic_discussion_article_id: props.articleId },
    });

    // Create new category associations
    if (props.body.category_codes.length > 0) {
      const categories = await tx.economic_discussion_categories.findMany({
        where: {
          code: { in: props.body.category_codes },
          is_active: true,
        },
      });

      await tx.economic_discussion_article_categories.createMany({
        data: categories.map((category) => ({
          id: v4() as string & tags.Format<"uuid">,
          economic_discussion_article_id: props.articleId,
          economic_discussion_category_id: category.id,
          created_at: new Date(),
        })),
      });
    }

    // Return updated article with categories
    return await tx.economic_discussion_articles.findUnique({
      where: { id: props.articleId },
      include: {
        economic_discussion_article_categories: {
          include: {
            category: true,
          },
        },
      },
    });
  });

  if (!updatedArticle) {
    throw new HttpException("Failed to update article categories", 500);
  }

  // Get member information if available
  let memberAuthor: IEconomicDiscussionMembers.ISummary | undefined;
  if (updatedArticle.economic_discussion_member_id) {
    const member = await MyGlobal.prisma.economic_discussion_members.findUnique(
      {
        where: { id: updatedArticle.economic_discussion_member_id },
      },
    );

    if (member) {
      memberAuthor = {
        id: member.id as string & tags.Format<"uuid">,
        username: member.username,
        email_verified: member.email_verified,
        reputation_score: member.reputation_score as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        created_at: toISOStringSafe(member.created_at),
      };
    }
  }

  // Get moderator information if available
  let moderatorAuthor: IEconomicDiscussionModerators.ISummary | undefined;
  if (updatedArticle.economic_discussion_moderator_id) {
    const moderator =
      await MyGlobal.prisma.economic_discussion_moderators.findUnique({
        where: { id: updatedArticle.economic_discussion_moderator_id },
      });

    if (moderator) {
      moderatorAuthor = {
        id: moderator.id as string & tags.Format<"uuid">,
        username: moderator.username,
        moderation_level: moderator.moderation_level as
          | "standard"
          | "senior"
          | "admin",
        created_at: toISOStringSafe(moderator.created_at),
      };
    }
  }

  const categories: IEconomicDiscussionCategories.ISummary[] =
    updatedArticle.economic_discussion_article_categories.map(
      (articleCategory) => ({
        id: articleCategory.category.id as string & tags.Format<"uuid">,
        code: articleCategory.category.code,
        name: articleCategory.category.name,
        display_order: articleCategory.category.display_order as number &
          tags.Type<"int32">,
        is_active: articleCategory.category.is_active,
        article_count: articleCategory.category.article_count as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      }),
    );

  return {
    id: updatedArticle.id,
    title: updatedArticle.title,
    view_count: updatedArticle.view_count as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    created_at: toISOStringSafe(updatedArticle.created_at),
    updated_at: toISOStringSafe(updatedArticle.updated_at),
    economic_discussion_member_id:
      updatedArticle.economic_discussion_member_id as string &
        tags.Format<"uuid">,
    economic_discussion_moderator_id:
      updatedArticle.economic_discussion_moderator_id as string &
        tags.Format<"uuid">,
    member_author: memberAuthor,
    moderator_author: moderatorAuthor,
    categories,
    attachments_count: 0,
    comments_count: 0,
    status: updatedArticle.status as "pending" | "approved" | "rejected",
  };
}
