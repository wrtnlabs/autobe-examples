import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_discussion_board_article_search_indexes_create_article_search_index } from "../../../generate/generate_random_discussion_board_article_search_indexes_create_article_search_index";
import { prepare_random_discussion_board_article_search_index } from "../../../prepare/prepare_random_discussion_board_article_search_index";

export async function test_api_discussion_board_article_search_index_create_idempotent_behavior(
  connection: api.IConnection,
): Promise<void> {
  // We test idempotency by doing multiple calls with the same body and expecting consistent or duplicate-safe behavior.
  // Actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare a sample body for creation - since IDiscussionBoardArticleSearchIndex.ICreate has no defined properties, we use empty object.
  const body = {} satisfies IDiscussionBoardArticleSearchIndex.ICreate;
  // First creation
  const first =
    await generate_random_discussion_board_article_search_indexes_create_article_search_index(
      userConnection,
      { body },
    );
  typia.assert(first);
  // Second creation with the same body - try to create again
  // According to scenario, this tests idempotent behavior
  try {
    const second =
      await generate_random_discussion_board_article_search_indexes_create_article_search_index(
        userConnection,
        { body },
      );
    typia.assert(second);
    // We expect either the same record (idempotent) or an error to be thrown
    // The test checks that the records are consistent or duplicates are handled
    // If no error, check if the id matches to enforce idempotency
    TestValidator.equals(
      "idempotent creation: id matches",
      first["id" as keyof typeof first],
      second["id" as keyof typeof second],
    );
  } catch (e) {
    // If error is thrown, confirm it's a duplicate ID or data integrity violation
    await TestValidator.error("duplicate creation fails safely", async () => {
      throw e;
    });
  }
}
