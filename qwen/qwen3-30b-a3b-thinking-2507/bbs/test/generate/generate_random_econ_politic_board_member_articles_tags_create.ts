import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_econ_politic_board_article_tag } from "../prepare/prepare_random_econ_politic_board_article_tag";

export async function generate_random_econ_politic_board_member_articles_tags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconPoliticBoardArticleTag.ICreate>;
    params: {
      articleId: string;
    };
  },
): Promise<IEconPoliticBoardArticleTag> {
  const prepared = prepare_random_econ_politic_board_article_tag(props.body);
  return await api.functional.econPoliticBoard.member.articles.tags.create(
    connection,
    {
      articleId: props.params.articleId,
      body: prepared,
    },
  );
}
