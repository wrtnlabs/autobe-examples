import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_tag } from "../prepare/prepare_random_discussion_board_article_tag";

export async function generate_random_discussion_board_administrator_tags_create_tag(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleTag.ICreate> | undefined;
  },
): Promise<IDiscussionBoardArticleTag> {
  const prepared: IDiscussionBoardArticleTag.ICreate =
    prepare_random_discussion_board_article_tag(props.body);
  const result: IDiscussionBoardArticleTag =
    await api.functional.discussionBoard.administrator.tags.createTag(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
