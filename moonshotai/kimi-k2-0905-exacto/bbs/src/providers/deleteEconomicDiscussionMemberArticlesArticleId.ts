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

export async function deleteEconomicDiscussionMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionArticle> {
  // Find the article to delete
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Check authorization - members can only delete their own articles
  if (article.economic_discussion_member_id !== props.member.id) {
    throw new HttpException("You can only delete your own articles", 403);
  }

  // Implement soft deletion
  const deletedArticle =
    await MyGlobal.prisma.economic_discussion_articles.update({
      where: { id: props.articleId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

  // Get article categories
  const articleCategories =
    await MyGlobal.prisma.economic_discussion_article_categories.findMany({
      where: { economic_discussion_article_id: props.articleId },
    });

  // Get member author details
  const memberAuthor = deletedArticle.economic_discussion_member_id
    ? await MyGlobal.prisma.economic_discussion_members.findUnique({
        where: { id: deletedArticle.economic_discussion_member_id },
      })
    : null;

  // Get moderator author details
  const moderatorAuthor = deletedArticle.economic_discussion_moderator_id
    ? await MyGlobal.prisma.economic_discussion_moderators.findUnique({
        where: { id: deletedArticle.economic_discussion_moderator_id },
      })
    : null;

  // Build categories array
  const categories: IEconomicDiscussionCategories.ISummary[] = [];
  for (const ac of articleCategories) {
    const category =
      await MyGlobal.prisma.economic_discussion_categories.findUnique({
        where: { id: ac.economic_discussion_category_id },
      });
    if (category) {
      categories.push({
        id: category.id,
        code: category.code,
        name: category.name,
        display_order: category.display_order,
        is_active: category.is_active,
        article_count: category.article_count,
      });
    }
  }

  // Build author profiles
  let memberAuthorProfile: IEconomicDiscussionMembers.ISummary | undefined;
  let moderatorAuthorProfile:
    | IEconomicDiscussionModerators.ISummary
    | undefined;

  if (memberAuthor) {
    memberAuthorProfile = {
      id: memberAuthor.id,
      username: memberAuthor.username,
      email_verified: memberAuthor.email_verified,
      reputation_score: memberAuthor.reputation_score,
      created_at: toISOStringSafe(memberAuthor.created_at),
    };
  }

  if (moderatorAuthor) {
    moderatorAuthorProfile = {
      id: moderatorAuthor.id,
      username: moderatorAuthor.username,
      moderation_level: typia.assert<"admin" | "standard" | "senior">(
        moderatorAuthor.moderation_level,
      ),
      created_at: toISOStringSafe(moderatorAuthor.created_at),
    };
  }

  return {
    id: deletedArticle.id,
    title: deletedArticle.title,
    content: deletedArticle.content,
    view_count: deletedArticle.view_count,
    version: deletedArticle.version,
    status: typia.assert<"pending" | "approved" | "rejected">(
      deletedArticle.status,
    ),
    created_at: toISOStringSafe(deletedArticle.created_at),
    updated_at: toISOStringSafe(deletedArticle.updated_at),
    deleted_at: deletedArticle.deleted_at
      ? toISOStringSafe(deletedArticle.deleted_at)
      : null,
    member_author: deletedArticle.economic_discussion_member_id,
    moderator_author: deletedArticle.economic_discussion_moderator_id,
    member_author_profile: memberAuthorProfile,
    moderator_author_profile: moderatorAuthorProfile,
    categories: categories,
  };
}
