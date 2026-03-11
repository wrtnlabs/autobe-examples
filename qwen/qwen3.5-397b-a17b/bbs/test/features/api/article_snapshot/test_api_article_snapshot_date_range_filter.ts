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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article snapshot date range filtering functionality.
 *
 * This test validates that administrators can filter article snapshots
 * by creation date range using created_at_from and created_at_to parameters.
 */
export async function test_api_article_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
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
  // 2. Create section for article
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. Member setup - register and login
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
  // 4. Create article (generates initial snapshot)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 5. Get all snapshots without filters (baseline)
  const allSnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 100,
          sort: "asc",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify we have at least one snapshot
  TestValidator.predicate(
    "at least one snapshot exists",
    () => allSnapshots.data.length >= 1,
  );
  // 6. Test created_at_from filter - get snapshots from first snapshot's time forward
  const firstSnapshot = allSnapshots.data[0];
  const fromFilter =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 100,
          sort: "asc",
          created_at_from: firstSnapshot.created_at,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(fromFilter);
  // Verify all filtered snapshots are >= from timestamp
  for (const snapshot of fromFilter.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at >= from filter`,
      () =>
        new Date(snapshot.created_at).getTime() >=
        new Date(firstSnapshot.created_at).getTime(),
    );
  }
  // 7. Test created_at_to filter - get snapshots up to last snapshot's time
  const lastSnapshot = allSnapshots.data[allSnapshots.data.length - 1];
  const toFilter =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 100,
          sort: "asc",
          created_at_to: lastSnapshot.created_at,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(toFilter);
  // Verify all filtered snapshots are <= to timestamp
  for (const snapshot of toFilter.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at <= to filter`,
      () =>
        new Date(snapshot.created_at).getTime() <=
        new Date(lastSnapshot.created_at).getTime(),
    );
  }
  // 8. Test combined date range filter
  const rangeFilter =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 100,
          sort: "asc",
          created_at_from: firstSnapshot.created_at,
          created_at_to: lastSnapshot.created_at,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(rangeFilter);
  // Verify all snapshots in range are within bounds
  for (const snapshot of rangeFilter.data) {
    const snapshotTime = new Date(snapshot.created_at).getTime();
    const fromTime = new Date(firstSnapshot.created_at).getTime();
    const toTime = new Date(lastSnapshot.created_at).getTime();
    TestValidator.predicate(
      `snapshot ${snapshot.id} within date range`,
      () => snapshotTime >= fromTime && snapshotTime <= toTime,
    );
  }
  // 9. Verify pagination metadata reflects filtered count
  TestValidator.equals(
    "pagination records matches data length",
    rangeFilter.pagination.records,
    rangeFilter.data.length,
  );
  // 10. Test with narrow date range that should exclude some snapshots
  if (allSnapshots.data.length > 1) {
    const middleIndex = Math.floor(allSnapshots.data.length / 2);
    const middleSnapshot = allSnapshots.data[middleIndex];
    const narrowFilter =
      await api.functional.discussionBoard.admin.articles.snapshots.index(
        adminConnection,
        {
          articleId: article.id,
          body: {
            page: 1,
            limit: 100,
            sort: "asc",
            created_at_from: middleSnapshot.created_at,
            created_at_to: middleSnapshot.created_at,
          } satisfies IDiscussionBoardArticleSnapshot.IRequest,
        },
      );
    typia.assert(narrowFilter);
    // Verify all results match the exact timestamp
    for (const snapshot of narrowFilter.data) {
      TestValidator.equals(
        `snapshot ${snapshot.id} matches exact timestamp`,
        snapshot.created_at,
        middleSnapshot.created_at,
      );
    }
  }
}
