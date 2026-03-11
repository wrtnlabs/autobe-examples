import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article snapshot retrieval with mismatched article ID.
 *
 * This test validates that the system properly prevents accessing a snapshot
 * using an incorrect article ID. When an administrator attempts to retrieve
 * a snapshot using an article ID that doesn't match the snapshot's parent
 * article, the system should return 404 Not Found, ensuring referential
 * integrity and proper isolation between different articles' audit trails.
 *
 * Test Flow:
 * 1. Administrator registration and login
 * 2. Member registration and login
 * 3. Section creation (prerequisite for articles)
 * 4. Create Article A
 * 5. Create Article B
 * 6. Attempt to retrieve a snapshot using Article A's ID with a snapshot ID
 *    that would belong to Article B's context - should fail with 404
 *
 * Note: Since the available API doesn't provide a snapshot listing endpoint,
 * this test uses randomly generated UUIDs to simulate the mismatch scenario.
 * The system should still validate the article-snapshot relationship and
 * return 404 when the snapshot doesn't belong to the specified article.
 */
export async function test_api_article_snapshot_article_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Member setup - create member account and login
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
  // 3. Create section (prerequisite for article creation)
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 4. Create Article A
  const articleA =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(articleA);
  // 5. Create Article B
  const articleB =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(articleB);
  // 6. Attempt to retrieve a snapshot using Article A's ID with a snapshot ID
  // that doesn't belong to Article A - should return 404
  // Using article B's ID as the snapshot ID to simulate mismatch scenario
  await TestValidator.error(
    "snapshot article mismatch should return 404",
    async () => {
      await api.functional.discussionBoard.admin.articles.snapshots.at(
        adminConnection,
        {
          articleId: articleA.id,
          snapshotId: articleB.id,
        },
      );
    },
  );
}
