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

export async function test_api_article_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving non-existent article snapshots.
   * 1. Administrator creates a section
   * 2. Member creates articles in the section
   * 3. Test invalid snapshotId for valid articleId (404)
   * 4. Test valid snapshotId from different article (404)
   */
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com/admin",
      referrer: "https://test.com/admin",
    },
  });
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 2. Member setup - create articles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com/member",
      referrer: "https://test.com/member",
    },
  });
  // Create first article
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: section.id,
        },
      },
    );
  typia.assert(article1);
  // Create second article for cross-reference test
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: section.id,
        },
      },
    );
  typia.assert(article2);
  // 3. Test Case 1: Invalid snapshotId for valid articleId
  const invalidSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "invalid snapshotId returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.articles.snapshots.at(
        memberConnection,
        {
          articleId: article1.id,
          snapshotId: invalidSnapshotId,
        },
      ),
  );
  // 4. Test Case 2: Valid snapshotId from different article
  // Use article2's ID as snapshotId for article1 - should fail
  await TestValidator.httpError(
    "snapshotId from different article returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.articles.snapshots.at(
        memberConnection,
        {
          articleId: article1.id,
          snapshotId: article2.id,
        },
      ),
  );
}
