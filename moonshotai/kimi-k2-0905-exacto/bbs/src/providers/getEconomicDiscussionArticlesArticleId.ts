import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";

export async function getEconomicDiscussionArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionArticle> {
  // Find the article with view count increment
  const [updatedArticle] = await MyGlobal.prisma.$transaction([
    // First increment the view count
    MyGlobal.prisma.economic_discussion_articles.update({
      where: { id: props.articleId },
      data: {
        view_count: {
          increment: 1,
        },
      },
    }),
  ]);

  if (!updatedArticle) {
    throw new HttpException("Article not found", 404);
  }

  // Only approved articles are publicly accessible for public endpoints
  if (updatedArticle.status !== "approved") {
    throw new HttpException("Article not found or not approved", 404);
  }

  // Get author information based on who's the author
  let memberAuthor: IEconomicDiscussionMembers.ISummary | undefined;
  let moderatorAuthor: IEconomicDiscussionModerators.ISummary | undefined;

  if (updatedArticle.economic_discussion_member_id) {
    const member = await MyGlobal.prisma.economic_discussion_members.findUnique(
      {
        where: { id: updatedArticle.economic_discussion_member_id },
        select: {
          id: true,
          username: true,
          email_verified: true,
          reputation_score: true,
          created_at: true,
        },
      },
    );

    if (member) {
      memberAuthor = {
        id: member.id,
        username: member.username,
        email_verified: member.email_verified,
        reputation_score: member.reputation_score,
        created_at: toISOStringSafe(member.created_at),
      };
    }
  } else if (updatedArticle.economic_discussion_moderator_id) {
    const moderator =
      await MyGlobal.prisma.economic_discussion_moderators.findUnique({
        where: { id: updatedArticle.economic_discussion_moderator_id },
        select: {
          id: true,
          username: true,
          moderation_level: true,
          created_at: true,
        },
      });

    if (moderator) {
      moderatorAuthor = {
        id: moderator.id,
        username: moderator.username,
        moderation_level: typia.assert<"admin" | "standard" | "senior">(
          moderator.moderation_level,
        ),
        created_at: toISOStringSafe(moderator.created_at),
      };
    }
  }

  // Get associated categories using direct query to avoid missing schema issues
  const categoryAssociations = await MyGlobal.prisma.$queryRaw`
    SELECT c.id, c.name, c.code, c.is_active, c.display_order
    FROM economic_discussion_categories c
    INNER JOIN economic_discussion_article_categories ac ON ac.economic_discussion_category_id = c.id
    WHERE ac.economic_discussion_article_id = ${props.articleId}
  `;

  const categories: IEconomicDiscussionCategories.ISummary[] = (
    categoryAssociations as any[]
  ).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    code: cat.code,
    is_active: Boolean(cat.is_active),
    display_order: Number(cat.display_order),
    article_count: 0, // Simplified for now - would need separate query for accurate count
  }));

  return {
    id: updatedArticle.id,
    title: updatedArticle.title,
    content: updatedArticle.content,
    view_count: updatedArticle.view_count,
    version: updatedArticle.version,
    status: updatedArticle.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(updatedArticle.created_at),
    updated_at: toISOStringSafe(updatedArticle.updated_at),
    deleted_at: updatedArticle.deleted_at
      ? toISOStringSafe(updatedArticle.deleted_at)
      : undefined,
    member_author: updatedArticle.economic_discussion_member_id ?? undefined,
    moderator_author:
      updatedArticle.economic_discussion_moderator_id ?? undefined,
    member_author_profile: memberAuthor,
    moderator_author_profile: moderatorAuthor,
    categories,
  };
}
