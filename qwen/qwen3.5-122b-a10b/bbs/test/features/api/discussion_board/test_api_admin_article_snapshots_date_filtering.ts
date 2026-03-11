import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test that an administrator can filter article snapshots by date range using the createdAfter and createdBefore parameters.
 *
 * Test flow:
 * 1. Create admin account and authenticate
 * 2. Create member account and authenticate
 * 3. Create an article (generates initial snapshot)
 * 4. Test filtering by createdAfter - should return snapshot when filter is before snapshot time
 * 5. Test filtering by createdBefore - should return snapshot when filter is after snapshot time
 * 6. Test combined date range filtering that includes the snapshot
 * 7. Test pagination with date filters
 * 8. Test sorting order (asc/desc) combined with date filters
 */
export async function test_api_admin_article_snapshots_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Re-authenticate with login for clean session
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Re-authenticate with login
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 3. Create article (generates initial snapshot)
  const article = await generate_random_discussion_board_member_articles_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        body: RandomGenerator.paragraph({ sentences: 10 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  const articleId = article.id;
  const snapshotTime = new Date(article.created_at);
  // 4. Test createdAfter filter - filter before snapshot time should return snapshot
  const afterFilterDate = new Date(snapshotTime.getTime() - 10000); // 10 seconds before
  const afterResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {
          createdAfter: afterFilterDate.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(afterResult);
  // Should find the snapshot since it's after the filter date
  TestValidator.predicate(
    "snapshot found with createdAfter filter",
    afterResult.data.some(
      (snapshot) => new Date(snapshot.created_at) >= afterFilterDate,
    ),
  );
  // 5. Test createdBefore filter - filter after snapshot time should return snapshot
  const beforeFilterDate = new Date(snapshotTime.getTime() + 10000); // 10 seconds after
  const beforeResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {
          createdBefore: beforeFilterDate.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(beforeResult);
  // Should find the snapshot since it's before the filter date
  TestValidator.predicate(
    "snapshot found with createdBefore filter",
    beforeResult.data.some(
      (snapshot) => new Date(snapshot.created_at) <= beforeFilterDate,
    ),
  );
  // 6. Test combined date range filtering that includes the snapshot
  const rangeStart = new Date(snapshotTime.getTime() - 5000); // 5 seconds before
  const rangeEnd = new Date(snapshotTime.getTime() + 5000); // 5 seconds after
  const rangeResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {
          createdAfter: rangeStart.toISOString(),
          createdBefore: rangeEnd.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(rangeResult);
  // Should find the snapshot within the range
  TestValidator.predicate(
    "snapshot found within date range",
    rangeResult.data.some(
      (snapshot) =>
        new Date(snapshot.created_at) >= rangeStart &&
        new Date(snapshot.created_at) <= rangeEnd,
    ),
  );
  // 7. Test pagination with date filters
  const paginationResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {
          createdAfter: afterFilterDate.toISOString(),
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Should have pagination metadata
  TestValidator.predicate(
    "pagination has correct structure",
    paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 2 &&
      paginationResult.pagination.records > 0,
  );
  // Data should respect the limit
  TestValidator.predicate(
    "pagination respects limit",
    paginationResult.data.length <= 2,
  );
  // 8. Test sorting order with date filters
  // Descending order (newest first)
  const descResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {
          createdAfter: afterFilterDate.toISOString(),
          order: "desc",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(descResult);
  // Verify descending order when multiple snapshots exist
  if (descResult.data.length > 1) {
    for (let i = 1; i < descResult.data.length; i++) {
      TestValidator.predicate(
        `descending order at index ${i}`,
        new Date(descResult.data[i - 1].created_at) >=
          new Date(descResult.data[i].created_at),
      );
    }
  }
  // Ascending order (oldest first)
  const ascResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {
          createdAfter: afterFilterDate.toISOString(),
          order: "asc",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(ascResult);
  // Verify ascending order when multiple snapshots exist
  if (ascResult.data.length > 1) {
    for (let i = 1; i < ascResult.data.length; i++) {
      TestValidator.predicate(
        `ascending order at index ${i}`,
        new Date(ascResult.data[i - 1].created_at) <=
          new Date(ascResult.data[i].created_at),
      );
    }
  }
  // 9. Test createdAfter filter that excludes the snapshot
  const excludeAfterDate = new Date(snapshotTime.getTime() + 10000); // 10 seconds after snapshot
  const excludeAfterResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {
          createdAfter: excludeAfterDate.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(excludeAfterResult);
  // Should not find any snapshots since they're all before the filter date
  TestValidator.predicate(
    "no snapshots found when filter excludes all",
    excludeAfterResult.data.length === 0,
  );
  // 10. Test createdBefore filter that excludes the snapshot
  const excludeBeforeDate = new Date(snapshotTime.getTime() - 10000); // 10 seconds before snapshot
  const excludeBeforeResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {
          createdBefore: excludeBeforeDate.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(excludeBeforeResult);
  // Should not find any snapshots since they're all after the filter date
  TestValidator.predicate(
    "no snapshots found when filter excludes all",
    excludeBeforeResult.data.length === 0,
  );
  // 11. Verify total snapshot count
  const allSnapshotsResult =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId,
        body: {} satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsResult);
  // Should have at least 1 snapshot (the initial one from article creation)
  TestValidator.predicate(
    "expected minimum snapshot count",
    allSnapshotsResult.pagination.records >= 1,
  );
}
