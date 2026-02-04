import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicDiscussionAuthCitizenLogin(props: {
  body: IEconomicDiscussionCitizen.ILogin;
}): Promise<IEconomicDiscussionCitizen.IAuthorized> {
  // Find citizen by email
  const citizen = await MyGlobal.prisma.economic_discussion_citizens.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      display_name: true,
      bio: true,
      email: true,
      password_hash: true, // Required for password verification
      created_at: true,
      updated_at: true,
    },
  });
  // Validate credentials
  if (!citizen) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    citizen.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Create new session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economic_discussion_citizen_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        citizen: { connect: { id: citizen.id } },
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
        ip: props.body.ip || "", // Add required ip field
        href: props.body.href || "", // Add required href field
      },
      select: {
        id: true,
        citizen: true,
        created_at: true,
        expired_at: true,
      },
    });
  // Generate JWT tokens with correct payload structure
  const accessToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      sessionId: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      sessionId: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Fetch articles authored by citizen
  const articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: { author: { id: citizen.id } },
    select: {
      id: true,
      title: true,
      created_at: true,
      comment_count: true,
      author: true,
    },
    orderBy: { created_at: "desc" },
  });
  // Fetch comments authored by citizen
  const comments = await MyGlobal.prisma.economic_discussion_comments.findMany({
    where: { economic_discussion_citizen_id: citizen.id }, // Use correct column name
    select: {
      id: true,
      content: true,
      created_at: true,
    },
    orderBy: { created_at: "asc" },
  });
  // Fetch article tags for each article
  const articleIds = articles.map((a) => a.id);
  const articleTags =
    await MyGlobal.prisma.economic_discussion_article_tags.findMany({
      where: { economic_discussion_article_id: { in: articleIds } }, // Use correct column name
      select: {
        economic_discussion_article_id: true, // Use correct column name
        tag: { select: { name: true } }, // Use relationship to get actual tag name
      },
    });
  // Group tags by article ID
  const tagsByArticleId = articleTags.reduce(
    (acc, tag) => {
      if (!acc[tag.economic_discussion_article_id]) {
        acc[tag.economic_discussion_article_id] = [];
      }
      acc[tag.economic_discussion_article_id].push({ name: tag.tag.name }); // Access name via relationship
      return acc;
    },
    {} as Record<
      string,
      {
        name: string | null;
      }[]
    >,
  );
  // Transform article data with tags
  const articlesWithTags = articles.map((article) => {
    const tags =
      tagsByArticleId[article.id]?.map((tag) => ({
        name: tag.name,
      })) || [];
    return {
      id: article.id,
      title: article.title,
      posted_time: article.created_at
        ? toISOStringSafe(article.created_at)
        : null,
      author: {
        id: article.author.id,
      },
      tags,
      comment_count: article.comment_count,
    };
  });
  // Transform comment data
  const commentsWithTimestamps = comments.map((comment) => ({
    content: comment.content,
    postedTime: toISOStringSafe(comment.created_at),
    economic_discussion_citizen_id: comment.economic_discussion_citizen_id,
  }));
  // Return IAuthorized citizen with token
  return {
    display_name: citizen.display_name,
    bio: citizen.bio ?? "",
    articles: articlesWithTags as IEconomicDiscussionArticle[],
    comments: commentsWithTimestamps as IEconomicDiscussionComment[],
    email: citizen.email,
    id: citizen.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IEconomicDiscussionCitizen.IAuthorized;
}
