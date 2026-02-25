import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleCollector } from "../collectors/DiscussionBoardArticleCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticles(props: {
  user: UserPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // Rate limiting check (10 articles per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_user_id: props.user.id,
      created_at: { gte: oneHourAgo },
      deleted_at: null,
    },
  });
  if (articleCount >= 10) {
    throw new HttpException(
      "Rate limit exceeded: maximum 10 articles per hour",
      429,
    );
  }
  // Validate section exists and is active
  const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
    where: {
      id: props.body.discussion_board_section_id,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found or inactive", 404);
  }
  // Create article
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: await DiscussionBoardArticleCollector.collect({
      body: props.body,
      discussionBoardUsers: { id: props.user.id },
      discussionBoardUserSessions: { id: props.user.session_id },
    }),
    ...DiscussionBoardArticleTransformer.select(),
  });
  return await DiscussionBoardArticleTransformer.transform(created);
}
