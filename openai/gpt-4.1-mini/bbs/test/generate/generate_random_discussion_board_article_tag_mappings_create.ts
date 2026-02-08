import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_tag_mapping } from "../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function generate_random_discussion_board_article_tag_mappings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleTagMapping.ICreate> | undefined;
  },
): Promise<IDiscussionBoardArticleTagMapping> {
  const prepared: IDiscussionBoardArticleTagMapping.ICreate =
    prepare_random_discussion_board_article_tag_mapping(props.body);
  const result: IDiscussionBoardArticleTagMapping =
    await api.functional.discussionBoard.article_tag_mappings.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
