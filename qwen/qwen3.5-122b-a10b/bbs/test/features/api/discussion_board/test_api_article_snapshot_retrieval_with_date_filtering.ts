import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_snapshot_retrieval_with_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and login
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Login as member
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  // 2. Create multiple articles at different times to generate snapshots
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // 3. Authenticate as administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 4. Get all snapshots for article1
  const allSnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article1.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 5. Test filtering with created_at_from only
  const fromTimestamp = new Date(
    allSnapshots.data[0]?.created_at ?? new Date(),
  );
  fromTimestamp.setMinutes(fromTimestamp.getMinutes() - 1);
  const snapshotsFrom =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article1.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: fromTimestamp.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsFrom);
  TestValidator.predicate(
    "snapshots from filter returns results",
    snapshotsFrom.data.length > 0,
  );
  // 6. Test filtering with created_at_to only
  const toTimestamp = new Date(allSnapshots.data[0]?.created_at ?? new Date());
  toTimestamp.setMinutes(toTimestamp.getMinutes() + 1);
  const snapshotsTo =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article1.id,
        body: {
          page: 1,
          limit: 100,
          created_at_to: toTimestamp.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsTo);
  TestValidator.predicate(
    "snapshots to filter returns results",
    snapshotsTo.data.length > 0,
  );
  // 7. Test filtering with both date boundaries
  const snapshotsRange =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article1.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: fromTimestamp.toISOString(),
          created_at_to: toTimestamp.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsRange);
  TestValidator.predicate(
    "snapshots range filter returns results",
    snapshotsRange.data.length > 0,
  );
  // 8. Test filtering with empty result set (date range with no snapshots)
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 10);
  const emptySnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article1.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: farFuture.toISOString(),
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty result set for future date range",
    emptySnapshots.data.length,
    0,
  );
  // 9. Verify pagination works correctly with date-filtered results
  TestValidator.equals(
    "pagination current page",
    snapshotsRange.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotsRange.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    snapshotsRange.pagination.records >= snapshotsRange.data.length,
  );
}
