import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 2. Member creates an article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 3. Unauthenticated guest retrieves the article (no auth token)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    guestConnection,
    {
      articleId: article.id,
    },
  );
  typia.assert(retrievedArticle);
  // 4. Validate article details match
  TestValidator.equals("article id matches", retrievedArticle.id, article.id);
  TestValidator.equals("title matches", retrievedArticle.title, article.title);
  TestValidator.equals(
    "content matches",
    retrievedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "section id matches",
    retrievedArticle.section.id,
    section.id,
  );
  TestValidator.predicate(
    "author has required fields",
    retrievedArticle.author.id !== undefined &&
      retrievedArticle.author.displayName !== undefined &&
      retrievedArticle.author.banned !== undefined &&
      retrievedArticle.author.createdAt !== undefined,
  );
  TestValidator.predicate(
    "section has required fields",
    retrievedArticle.section.id !== undefined &&
      retrievedArticle.section.name !== undefined &&
      retrievedArticle.section.description !== undefined &&
      retrievedArticle.section.sequence !== undefined,
  );
  TestValidator.predicate(
    "tags is array",
    Array.isArray(retrievedArticle.tags),
  );
  TestValidator.predicate(
    "attachments is array",
    Array.isArray(retrievedArticle.attachments),
  );
  TestValidator.predicate(
    "comments_count is non-negative",
    retrievedArticle.comments_count >= 0,
  );
  TestValidator.predicate(
    "created_at is present",
    retrievedArticle.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedArticle.updated_at !== undefined,
  );
}
