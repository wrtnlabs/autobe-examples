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

export async function test_api_article_tag_mapping_create_success(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const output =
    await generate_random_discussion_board_article_tag_mappings_create(
      userConnection,
      {},
    );
  typia.assert(output);
}
