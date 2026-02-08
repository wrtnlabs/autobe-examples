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

export async function test_api_article_tag_mapping_deletion_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of an existing article-tag mapping
  const userConnection: api.IConnection = { host: connection.host };
  // Create a mapping to delete
  const mapping =
    await generate_random_discussion_board_article_tag_mappings_create(
      userConnection,
      { body: {} },
    );
  typia.assert(mapping);
  // Delete the mapping by mappingId
  // Since we do not know the exact property representing the ID, create a placeholder UUID
  const mappingId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.discussionBoard.article_tag_mappings.erase(
    userConnection,
    {
      mappingId: mappingId,
    },
  );
  // Scenario 2: Attempt to delete a non-existing article-tag mapping
  const fakeMappingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existing mapping deletion returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.article_tag_mappings.erase(
        userConnection,
        {
          mappingId: fakeMappingId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized deletion attempt (simulate by new connection without auth)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized deletion returns 403",
    403,
    async () => {
      await api.functional.discussionBoard.article_tag_mappings.erase(
        guestConnection,
        {
          mappingId: fakeMappingId,
        },
      );
    },
  );
}
