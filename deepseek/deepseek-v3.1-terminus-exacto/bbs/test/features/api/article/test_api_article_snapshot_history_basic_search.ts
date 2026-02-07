import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
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

export async function test_api_article_snapshot_history_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create a single article - snapshots would normally be generated from edits
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Search for snapshots with empty criteria (default pagination)
  // Note: Since article editing is not available in the current API,
  // this will test the snapshot search functionality with whatever
  // snapshots might exist (likely just the initial creation snapshot)
  const snapshots =
    await api.functional.discussionBoard.articles.snapshots.index(
      userConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate("limit is positive", snapshots.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // Validate snapshot data structure for any returned snapshots
  if (snapshots.data.length > 0) {
    for (const snapshot of snapshots.data) {
      TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
      TestValidator.predicate(
        "snapshot has title",
        snapshot.title !== undefined,
      );
      TestValidator.predicate(
        "snapshot has created_at",
        snapshot.created_at !== undefined,
      );
      TestValidator.predicate(
        "snapshot has article reference",
        snapshot.article !== undefined,
      );
      TestValidator.predicate(
        "article reference has id",
        snapshot.article.id !== undefined,
      );
      TestValidator.predicate(
        "article reference has title",
        snapshot.article.title !== undefined,
      );
    }
    // Validate sorting (most recent first) if multiple snapshots exist
    if (snapshots.data.length > 1) {
      for (let i = 1; i < snapshots.data.length; i++) {
        const currentDate = new Date(snapshots.data[i].created_at);
        const previousDate = new Date(snapshots.data[i - 1].created_at);
        TestValidator.predicate(
          `snapshot ${i} is older than or equal to snapshot ${i - 1}`,
          currentDate <= previousDate,
        );
      }
    }
  }
}
