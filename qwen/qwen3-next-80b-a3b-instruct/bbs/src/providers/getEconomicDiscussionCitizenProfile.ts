import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEconomicDiscussionCitizenProfile(props: {
  citizen: CitizenPayload;
}): Promise<IEconomicDiscussionCitizen> {
  // Fetch user profile data
  const citizen =
    await MyGlobal.prisma.economic_discussion_citizens.findUniqueOrThrow({
      where: { id: props.citizen.id },
    });
  // Fetch all articles authored by this citizen
  const articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: { author_id: props.citizen.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      created_at: true,
      comment_count: true,
      author_id: true,
      articleTags: true,
    },
  });
  // Transform articles into IEconomicDiscussionArticle[]
  const articleList: IEconomicDiscussionArticle[] = articles.map((article) => ({
    id: article.id,
    title: article.title,
    posted_time: toISOStringSafe(article.created_at),
    comment_count: article.comment_count,
    author: {
      id: citizen.id,
    },
    tags: article.articleTags.map((tag) => ({
      name: tag.tag,
    })),
  }));
  // Fetch all comments authored by this citizen
  const comments = await MyGlobal.prisma.economic_discussion_comments.findMany({
    where: {
      economic_discussion_citizen_id: props.citizen.id,
    },
    orderBy: { created_at: "asc" },
    select: {
      content: true,
      created_at: true,
    },
  });
  // Transform comments into IEconomicDiscussionComment[]
  const commentList: IEconomicDiscussionComment[] = comments.map((comment) => ({
    content: comment.content,
    postedTime: toISOStringSafe(comment.created_at),
    economic_discussion_citizen_id: props.citizen.id,
  }));
  // Return full profile
  return {
    display_name: citizen.display_name,
    bio: citizen.bio ?? "",
    articles: articleList,
    comments: commentList,
  };
}
