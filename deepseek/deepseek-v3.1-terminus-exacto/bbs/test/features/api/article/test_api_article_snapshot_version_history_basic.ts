import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_snapshot_version_history_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate (sections are created by admins)
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: Since we don't have admin auth utility functions, we'll need to create a section
  // using available APIs or skip section validation if not critical
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // For this test, we'll assume a section exists or the system has a default section
  // Since we don't have admin auth to create sections, we'll use a valid section ID
  // This is a limitation of the current test setup
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article using the generation function
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Retrieve article version history
  const snapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate pagination metadata
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("limit matches request", snapshots.pagination.limit, 20);
  TestValidator.predicate("has records", snapshots.pagination.records >= 1);
  TestValidator.predicate("has pages", snapshots.pagination.pages >= 1);
  // Validate at least one snapshot exists
  TestValidator.predicate("has snapshot data", snapshots.data.length >= 1);
  // Validate snapshot structure
  const snapshot = snapshots.data[0];
  TestValidator.equals(
    "snapshot title matches article",
    snapshot.title,
    article.title,
  );
  TestValidator.equals(
    "snapshot author id",
    snapshot.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "snapshot section id",
    snapshot.section.id,
    article.section.id,
  );
}
