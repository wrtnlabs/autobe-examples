import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_article_snapshot_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article first
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Note: Since there's no explicit snapshot creation API provided,
  // we assume snapshots are created automatically when articles are created or modified
  // For this test to work, we need to identify how to get a valid snapshot ID
  // This is a limitation in the current test scenario design
  // For demonstration purposes, assuming we can get snapshot IDs somehow
  // In a real implementation, there would be a way to list or create snapshots
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the article snapshot
  const snapshot =
    await api.functional.discussionBoard.user.articles.snapshots.at(
      userConnection,
      {
        articleId: article.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot data structure
  TestValidator.equals(
    "snapshot article ID matches",
    snapshot.article_id,
    article.id,
  );
  TestValidator.equals(
    "snapshot author ID matches",
    snapshot.author.id,
    user.id,
  );
  TestValidator.predicate("snapshot has title", snapshot.title.length > 0);
  TestValidator.predicate("snapshot has content", snapshot.content.length > 0);
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
}
