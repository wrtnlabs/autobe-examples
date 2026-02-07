import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

export async function test_api_article_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection and authenticate
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
  // Note: Since we don't have section creation utilities and sections are admin-managed,
  // we'll need to work with the assumption that at least one active section exists.
  // In a real test environment, we would create a section first, but given the constraints,
  // we'll proceed with creating an article using a placeholder section_id.
  // The test focuses on deletion idempotency, not section validation.
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // First deletion - should succeed
  const firstDelete = await api.functional.discussionBoard.user.articles.erase(
    userConnection,
    {
      articleId: article.id,
    },
  );
  typia.assert(firstDelete);
  // Verify article is soft-deleted
  TestValidator.predicate(
    "article should have deleted_at timestamp",
    firstDelete.deleted_at !== null && firstDelete.deleted_at !== undefined,
  );
  const initialDeletedAt = firstDelete.deleted_at;
  // Second deletion attempt
  const secondDelete = await api.functional.discussionBoard.user.articles.erase(
    userConnection,
    {
      articleId: article.id,
    },
  );
  typia.assert(secondDelete);
  // Validate idempotent behavior
  TestValidator.equals(
    "deleted_at timestamp should remain unchanged",
    secondDelete.deleted_at,
    initialDeletedAt,
  );
  TestValidator.equals(
    "article ID should remain the same",
    secondDelete.id,
    article.id,
  );
  TestValidator.equals(
    "article title should remain the same",
    secondDelete.title,
    article.title,
  );
}
