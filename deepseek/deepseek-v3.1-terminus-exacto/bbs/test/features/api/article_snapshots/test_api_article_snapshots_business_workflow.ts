import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test the business workflow of tracking article evolution through snapshots.
 * 1. Authenticate as a user
 * 2. Create initial article version
 * 3. Perform first edit (title change) to generate snapshot
 * 4. Perform second edit (content modification) for additional snapshot
 * 5. Perform third edit (comprehensive update) for snapshot workflow
 * 6. Retrieve snapshots and validate chronological progression
 */
export async function test_api_article_snapshots_business_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create initial article
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const initialArticle =
    await api.functional.discussionBoard.user.articles.create(userConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(initialArticle);
  // 3. First edit - title change
  const firstEdit = await api.functional.discussionBoard.user.articles.update(
    userConnection,
    {
      articleId: initialArticle.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(firstEdit);
  // 4. Second edit - content modification
  const secondEdit = await api.functional.discussionBoard.user.articles.update(
    userConnection,
    {
      articleId: initialArticle.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(secondEdit);
  // 5. Third edit - comprehensive update
  const thirdEdit = await api.functional.discussionBoard.user.articles.update(
    userConnection,
    {
      articleId: initialArticle.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.paragraph({ sentences: 10 }),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(thirdEdit);
  // 6. Retrieve snapshots and validate progression
  const snapshots =
    await api.functional.discussionBoard.user.articles.snapshots.index(
      userConnection,
      {
        articleId: initialArticle.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate snapshot count (should have 3 snapshots for 3 edits)
  TestValidator.predicate(
    "should have snapshots for each edit",
    snapshots.data.length >= 3,
  );
  // Validate chronological order (newest first)
  if (snapshots.data.length > 1) {
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      const current = new Date(snapshots.data[i].created_at);
      const next = new Date(snapshots.data[i + 1].created_at);
      TestValidator.predicate(
        `snapshot ${i} should be newer than snapshot ${i + 1}`,
        current >= next,
      );
    }
  }
  // Validate snapshot content preservation
  snapshots.data.forEach((snapshot, index) => {
    TestValidator.equals(
      `snapshot ${index} should have valid title`,
      typeof snapshot.title,
      "string",
    );
    TestValidator.predicate(
      `snapshot ${index} should have non-empty title`,
      snapshot.title.length > 0,
    );
    TestValidator.equals(
      `snapshot ${index} should have valid author`,
      snapshot.author.id,
      user.id,
    );
  });
}
