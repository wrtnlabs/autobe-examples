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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticles(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // 1. Verify section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.body.discussion_board_section_id },
  });
  // 2. Rate limit: 10 articles per hour for superAdmin (optional but implement)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_user_id: props.superAdmin.id,
      created_at: { gte: oneHourAgo },
    },
  });
  if (recentCount >= 10) {
    throw new HttpException("Rate limit exceeded: 10 articles per hour", 429);
  }
  // 3. Create article using collector
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: await DiscussionBoardArticleCollector.collect({
      body: props.body,
      discussionBoardUsers: { id: props.superAdmin.id },
      discussionBoardUserSessions: { id: props.superAdmin.session_id },
    }),
    ...DiscussionBoardArticleTransformer.select(),
  });
  // 4. Transform to response
  return await DiscussionBoardArticleTransformer.transform(created);
}
