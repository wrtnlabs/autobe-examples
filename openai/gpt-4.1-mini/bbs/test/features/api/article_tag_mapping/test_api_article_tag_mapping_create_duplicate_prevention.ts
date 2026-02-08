import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_discussion_board_article_tag_mappings_create } from "../../../generate/generate_random_discussion_board_article_tag_mappings_create";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function test_api_article_tag_mapping_create_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create actor specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create an article-tag mapping successfully
  const first =
    await generate_random_discussion_board_article_tag_mappings_create(
      userConnection,
      {},
    );
  typia.assert(first);
  // 2. Attempt to create the same mapping again and expect failure
  await TestValidator.error(
    "should reject duplicate article-tag mapping creation",
    async () => {
      await generate_random_discussion_board_article_tag_mappings_create(
        userConnection,
        {
          body: {
            // Use the same fields that uniquely identify the mapping
            /*
                Since the DTO properties are empty objects, we have no explicit fields.
                We replicate the same mapping by reusing the same object for the body,
                expecting the backend to detect duplicates.
                */
            ...first,
          },
        },
      );
    },
  );
}
