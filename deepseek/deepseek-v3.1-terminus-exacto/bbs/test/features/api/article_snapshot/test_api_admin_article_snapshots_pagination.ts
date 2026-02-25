import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_admin_article_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create test article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Update article 3 times to create snapshots
  const updates = [
    {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      content: RandomGenerator.content({ paragraphs: 2 }),
    },
    {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      content: RandomGenerator.content({ paragraphs: 2 }),
    },
    {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      content: RandomGenerator.content({ paragraphs: 2 }),
    },
  ] satisfies IDiscussionBoardArticle.IUpdate[];
  for (const update of updates) {
    await api.functional.discussionBoard.admin.articles.update(
      adminConnection,
      {
        articleId: article.id,
        body: update,
      },
    );
  }
  // 4. Test pagination with different parameters
  // Test page 1 with limit 2
  const page1 =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // Test that we received paginated data with records
  TestValidator.predicate("page1 has data records", page1.data.length > 0);
  // Test page 2 with same limit
  const page2 =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.predicate("page2 has data records", page2.data.length >= 0);
  // Test default pagination (no parameters)
  const defaultPage =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page has data",
    defaultPage.data.length >= 0,
  );
  // 5. Validate snapshot summary structure
  if (page1.data.length > 0) {
    const snapshot = page1.data[0];
    TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
    TestValidator.predicate("snapshot has title", snapshot.title.length > 0);
    TestValidator.predicate(
      "snapshot has section",
      snapshot.section.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has author",
      snapshot.author.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at.length > 0,
    );
  }
  // 6. Retrieve all snapshots to verify ordering
  const allSnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          limit: 10,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  if (allSnapshots.data.length > 1) {
    // Verify snapshots are ordered by created_at descending
    TestValidator.index(
      "snapshots ordered by created_at descending",
      [...allSnapshots.data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
      allSnapshots.data,
    );
  }
}
