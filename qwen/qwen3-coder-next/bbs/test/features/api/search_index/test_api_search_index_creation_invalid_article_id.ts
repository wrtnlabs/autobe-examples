import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_discussion_board_search_indices_create } from "../../../generate/generate_random_discussion_board_search_indices_create";
import { prepare_random_discussion_board_search_index } from "../../../prepare/prepare_random_discussion_board_search_index";

export async function test_api_search_index_creation_invalid_article_id(
  connection: api.IConnection,
): Promise<void> {
  // Test search index creation with non-existent article_id validation
  const adminConnection: api.IConnection = { host: connection.host };
  await generate_random_discussion_board_search_indices_create(
    adminConnection,
    {
      body: {
        article_id: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
        title: "Test Title",
        content: "Test Content",
      } satisfies IDiscussionBoardSearchIndex.ICreate,
    },
  );
}
