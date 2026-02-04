import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleAttachment";
import type { IEconPoliticBoardArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleVersion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_econ_politic_board_article_version } from "../prepare/prepare_random_econ_politic_board_article_version";

export async function generate_random_econ_politic_board_admin_articles_versions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconPoliticBoardArticleVersion.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IEconPoliticBoardArticleVersion> {
  const prepared: IEconPoliticBoardArticleVersion.ICreate =
    prepare_random_econ_politic_board_article_version(props.body);
  return await api.functional.econPoliticBoard.admin.articles.versions.create(
    connection,
    {
      articleId: props.params.articleId,
      body: prepared,
    },
  );
}
