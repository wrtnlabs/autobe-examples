import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the primary success path for creating an article snapshot.
 * 1. Administrator authenticates and creates a section
 * 2. Member authenticates and creates an article in the section
 * 3. Administrator creates a snapshot of the article
 * 4. Validate snapshot contains all article data captured at point in time
 */
export async function test_api_article_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Administrator creates a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 4. Member creates an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Administrator creates a snapshot of the article
  const snapshot =
    await api.functional.discussionBoard.articles.snapshots.create(
      adminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot contains correct article data
  TestValidator.equals(
    "snapshot article id matches",
    snapshot.article.id,
    article.id,
  );
  TestValidator.equals(
    "snapshot title matches article",
    snapshot.title,
    article.title,
  );
  TestValidator.equals(
    "snapshot content matches article",
    snapshot.content,
    article.content,
  );
  // 7. Validate snapshot author information
  TestValidator.equals(
    "snapshot author id matches",
    snapshot.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "snapshot author email matches",
    snapshot.author.email,
    article.author.email,
  );
  // 8. Validate snapshot section information
  TestValidator.equals(
    "snapshot section id matches",
    snapshot.section.id,
    section.id,
  );
  TestValidator.equals(
    "snapshot section name matches",
    snapshot.section.name,
    section.name,
  );
  // 9. Validate snapshot has valid timestamp
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
}
