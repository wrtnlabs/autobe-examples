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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconomicDiscussionMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionArticle.IUpdate;
}): Promise<IEconomicDiscussionArticle> {
  // Verify article exists and member owns it
  const existingArticle =
    await MyGlobal.prisma.economic_discussion_articles.findUnique({
      where: { id: props.articleId },
    });

  if (!existingArticle) {
    throw new HttpException("Article not found", 404);
  }

  // Check if member owns this article
  if (existingArticle.economic_discussion_member_id !== props.member.id) {
    throw new HttpException("You can only update your own articles", 403);
  }

  // Check if article is soft-deleted
  if (existingArticle.deleted_at) {
    throw new HttpException("Cannot update deleted article", 403);
  }

  // Update article with new data
  const updatedArticle =
    await MyGlobal.prisma.economic_discussion_articles.update({
      where: { id: props.articleId },
      data: {
        title: props.body.title,
        content: props.body.content,
        status: props.body.status ?? existingArticle.status,
        version: existingArticle.version + 0.1,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Fetch author information
  const memberAuthor = updatedArticle.economic_discussion_member_id
    ? await MyGlobal.prisma.economic_discussion_members.findUnique({
        where: { id: updatedArticle.economic_discussion_member_id },
      })
    : null;

  const moderatorAuthor = updatedArticle.economic_discussion_moderator_id
    ? await MyGlobal.prisma.economic_discussion_moderators.findUnique({
        where: { id: updatedArticle.economic_discussion_moderator_id },
      })
    : null;

  // Fetch article-category relations first
  const articleCategories =
    await MyGlobal.prisma.economic_discussion_article_categories.findMany({
      where: { economic_discussion_article_id: updatedArticle.id },
    });

  // Extract category IDs from relations
  const categoryIds = articleCategories.map(
    (rel) => rel.economic_discussion_category_id,
  );

  if (categoryIds.length === 0) {
    return {
      id: updatedArticle.id as string & tags.Format<"uuid">,
      title: updatedArticle.title,
      content: updatedArticle.content,
      status: updatedArticle.status as "pending" | "approved" | "rejected",
      version: updatedArticle.version,
      view_count: updatedArticle.view_count,
      created_at: toISOStringSafe(updatedArticle.created_at),
      updated_at: toISOStringSafe(updatedArticle.updated_at),
      deleted_at: updatedArticle.deleted_at
        ? toISOStringSafe(updatedArticle.deleted_at)
        : undefined,
      member_author: updatedArticle.economic_discussion_member_id as
        | (string & tags.Format<"uuid">)
        | null
        | undefined,
      moderator_author: updatedArticle.economic_discussion_moderator_id as
        | (string & tags.Format<"uuid">)
        | null
        | undefined,
      member_author_profile: memberAuthor
        ? {
            id: memberAuthor.id as string & tags.Format<"uuid">,
            username: memberAuthor.username,
            email_verified: memberAuthor.email_verified,
            reputation_score: memberAuthor.reputation_score,
            created_at: toISOStringSafe(memberAuthor.created_at),
          }
        : undefined,
      moderator_author_profile: moderatorAuthor
        ? {
            id: moderatorAuthor.id as string & tags.Format<"uuid">,
            username: moderatorAuthor.username,
            moderation_level: moderatorAuthor.moderation_level as
              | "standard"
              | "senior"
              | "admin",
            created_at: toISOStringSafe(moderatorAuthor.created_at),
          }
        : undefined,
      categories: [],
    };
  }

  // Fetch actual category details
  const categories = await Promise.all(
    categoryIds.map((categoryId) =>
      MyGlobal.prisma.economic_discussion_categories.findUnique({
        where: { id: categoryId },
      }),
    ),
  );

  // Filter out any null results
  const validCategories = categories.filter(
    (cat): cat is NonNullable<(typeof categories)[0]> => cat !== null,
  );

  // Get article counts for each category
  const categoryArticleCounts = await Promise.all(
    validCategories.map((category) =>
      MyGlobal.prisma.economic_discussion_article_categories.count({
        where: { economic_discussion_category_id: category.id },
      }),
    ),
  );

  const formattedCategories = validCategories.map((category, index) => ({
    id: category.id as string & tags.Format<"uuid">,
    code: category.code,
    name: category.name,
    display_order: category.display_order,
    is_active: category.is_active,
    article_count: categoryArticleCounts[index],
  })) as IEconomicDiscussionCategories.ISummary[];

  // Return formatted response
  return {
    id: updatedArticle.id as string & tags.Format<"uuid">,
    title: updatedArticle.title,
    content: updatedArticle.content,
    status: updatedArticle.status as "pending" | "approved" | "rejected",
    version: updatedArticle.version,
    view_count: updatedArticle.view_count,
    created_at: toISOStringSafe(updatedArticle.created_at),
    updated_at: toISOStringSafe(updatedArticle.updated_at),
    deleted_at: updatedArticle.deleted_at
      ? toISOStringSafe(updatedArticle.deleted_at)
      : undefined,
    member_author: updatedArticle.economic_discussion_member_id as
      | (string & tags.Format<"uuid">)
      | null
      | undefined,
    moderator_author: updatedArticle.economic_discussion_moderator_id as
      | (string & tags.Format<"uuid">)
      | null
      | undefined,
    member_author_profile: memberAuthor
      ? {
          id: memberAuthor.id as string & tags.Format<"uuid">,
          username: memberAuthor.username,
          email_verified: memberAuthor.email_verified,
          reputation_score: memberAuthor.reputation_score,
          created_at: toISOStringSafe(memberAuthor.created_at),
        }
      : undefined,
    moderator_author_profile: moderatorAuthor
      ? {
          id: moderatorAuthor.id as string & tags.Format<"uuid">,
          username: moderatorAuthor.username,
          moderation_level: moderatorAuthor.moderation_level as
            | "standard"
            | "senior"
            | "admin",
          created_at: toISOStringSafe(moderatorAuthor.created_at),
        }
      : undefined,
    categories: formattedCategories,
  };
}
