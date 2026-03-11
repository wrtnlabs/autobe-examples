import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Random UUID that doesn't exist in database
  await TestValidator.httpError("random UUID not found", 404, async () => {
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  // Test 2: Valid UUID format but no matching record
  // This is essentially the same as test 1 since both test non-existent articles
  // We'll use a different random UUID to demonstrate the concept
  await TestValidator.httpError(
    "valid UUID format but no record",
    404,
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Note: Test 3 (soft-deleted article) cannot be implemented without
  // creating articles first, which violates the scenario requirement
  // "Test should not create any articles first". Therefore, we focus
  // on testing non-existent articles as specified.
}
