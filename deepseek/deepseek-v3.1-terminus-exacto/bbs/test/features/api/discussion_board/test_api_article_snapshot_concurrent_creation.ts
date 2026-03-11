import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_snapshots_create } from "../../../generate/generate_random_discussion_board_member_articles_snapshots_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_snapshot } from "../../../prepare/prepare_random_discussion_board_article_snapshot";

export async function test_api_article_snapshot_concurrent_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // Create an article for snapshot testing
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create multiple snapshots concurrently using Promise.all for true concurrency
  const snapshotCount = 5;
  const snapshotPromises = ArrayUtil.repeat(snapshotCount, () =>
    generate_random_discussion_board_member_articles_snapshots_create(
      memberConnection,
      {
        body: {
          discussion_board_article_id: article.id,
          snapshot_reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleSnapshot.ICreate,
      },
    ),
  );
  const snapshots = await Promise.all(snapshotPromises);
  // Validate all snapshots were created successfully
  TestValidator.equals(
    "all concurrent snapshot creations should succeed",
    snapshots.length,
    snapshotCount,
  );
  // Validate each snapshot
  snapshots.forEach((snapshot, index) => {
    typia.assert(snapshot);
    TestValidator.equals(
      `snapshot ${index + 1} should have correct article title`,
      snapshot.title,
      article.title,
    );
    TestValidator.equals(
      `snapshot ${index + 1} should have correct article body`,
      snapshot.body,
      article.body,
    );
    TestValidator.equals(
      `snapshot ${index + 1} should reference correct author`,
      snapshot.author.id,
      article.author.id,
    );
    TestValidator.predicate(
      `snapshot ${index + 1} should have valid creation timestamp`,
      new Date(snapshot.createdAt).getTime() > 0,
    );
  });
  // Validate uniqueness of snapshot IDs
  const snapshotIds = snapshots.map((s) => s.id);
  const uniqueIds = new Set(snapshotIds);
  TestValidator.equals(
    "all snapshot IDs should be unique",
    uniqueIds.size,
    snapshotIds.length,
  );
  // Validate data consistency across all snapshots
  const firstSnapshot = snapshots[0];
  snapshots.forEach((snapshot, index) => {
    if (index > 0) {
      TestValidator.equals(
        `snapshot ${index + 1} should have same content as first snapshot`,
        snapshot.title,
        firstSnapshot.title,
      );
      TestValidator.equals(
        `snapshot ${index + 1} should have same body as first snapshot`,
        snapshot.body,
        firstSnapshot.body,
      );
    }
  });
  // Validate that concurrent operations didn't cause data corruption
  TestValidator.predicate(
    "all snapshots should have valid author display names",
    snapshots.every((s) => s.author.display_name.length > 0),
  );
  TestValidator.predicate(
    "all snapshots should have valid section names",
    snapshots.every((s) => s.section.name.length > 0),
  );
}
