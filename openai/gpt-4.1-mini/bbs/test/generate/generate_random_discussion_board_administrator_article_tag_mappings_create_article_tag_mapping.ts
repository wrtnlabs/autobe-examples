import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_article_tag_mapping } from "../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function generate_random_discussion_board_administrator_article_tag_mappings_create_article_tag_mapping(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleTagMapping.ICreate> | undefined;
  },
): Promise<IDiscussionBoardArticleTagMapping> {
  const prepared: IDiscussionBoardArticleTagMapping.ICreate =
    prepare_random_discussion_board_article_tag_mapping(props.body);
  return await api.functional.discussionBoard.administrator.article_tag_mappings.createArticleTagMapping(
    connection,
    {
      body: prepared,
    },
  );
}
