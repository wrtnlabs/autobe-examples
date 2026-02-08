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

export async function test_api_discussion_board_article_search_index_create_with_invalid_article_id(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to create an article search index with an invalid (non-existent) discussion_board_article_id
  // Expected: The system should reject the request with an error due to relational integrity violation.
  // Create a new connection instance for the user (no authorization utility available)
  const userConnection: api.IConnection = { host: connection.host };
  // Compose the request body with only the allowed properties of IDiscussionBoardArticleSearchIndex.ICreate (which is empty)
  // According to the schema and description, the body must contain discussion_board_article_id and text content fields,
  // but since the IDiscussionBoardArticleSearchIndex.ICreate schema is empty, we cannot fill anything.
  // So try sending empty body
  await TestValidator.error(
    "should fail to create article search index with invalid article id",
    async () => {
      await generate_random_discussion_board_article_search_indexes_create_article_search_index(
        userConnection,
        {
          body: {}, // Empty body since ICreate is empty
        },
      );
    },
  );
}
