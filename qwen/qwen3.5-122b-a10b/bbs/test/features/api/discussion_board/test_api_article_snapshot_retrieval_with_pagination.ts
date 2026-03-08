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

export async function test_api_article_snapshot_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account and login
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login as admin with correct credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Setup: Create member account and login to create an article
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Login as member
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 3. Create an article (this will create the first snapshot)
  // Note: generate_random_discussion_board_member_articles_create handles section/tag creation internally
  const article = await generate_random_discussion_board_member_articles_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies Partial<IDiscussionBoardArticle.ICreate>,
    },
  );
  typia.assert(article);
  // 4. Test 1: Retrieve snapshots with default pagination
  const snapshotsDefault =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(snapshotsDefault);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination.current is positive",
    snapshotsDefault.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination.limit is positive",
    snapshotsDefault.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination.records exists",
    snapshotsDefault.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.pages matches data",
    snapshotsDefault.pagination.pages > 0,
    true,
  );
  // 6. Verify at least one snapshot exists (the initial creation snapshot)
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsDefault.data.length > 0,
  );
  // 7. Verify snapshot summary structure (typia.assert already validates all fields)
  const firstSnapshot = snapshotsDefault.data[0];
  typia.assert(firstSnapshot);
  // 8. Verify section and member information exists
  typia.assert(firstSnapshot.section);
  typia.assert(firstSnapshot.member);
  // 9. Test pagination with different page and limit values
  const snapshotsPage2 =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage2);
  TestValidator.equals(
    "pagination.page=2",
    snapshotsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination.limit=10",
    snapshotsPage2.pagination.limit,
    10,
  );
  // 10. Test sorting descending (default)
  const snapshotsDesc =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId: article.id,
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsDesc);
  // 11. Test sorting ascending
  const snapshotsAsc =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminLoginConnection,
      {
        articleId: article.id,
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAsc);
  // 12. Verify soft-deleted snapshots are excluded (all returned snapshots have deleted_at = null)
  for (const snapshot of snapshotsDefault.data) {
    TestValidator.equals(
      "deleted_at is null for active snapshots",
      snapshot.deleted_at,
      null,
    );
  }
}
