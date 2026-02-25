import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import type { IEconomicPoliticalDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardComment";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_discussion_board_comment } from "../prepare/prepare_random_economic_political_discussion_board_comment";

export async function generate_random_economic_political_discussion_board_user_articles_comments_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEconomicPoliticalDiscussionBoardComment.ICreate>
      | undefined;
    params: {
      articleId: string & tags.Format<"uuid">;
    };
  },
): Promise<IEconomicPoliticalDiscussionBoardComment> {
  const prepared: IEconomicPoliticalDiscussionBoardComment.ICreate =
    prepare_random_economic_political_discussion_board_comment(props.body);
  const result: IEconomicPoliticalDiscussionBoardComment =
    await api.functional.economicPoliticalDiscussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: props.params.articleId,
        body: prepared,
      },
    );
  return result;
}
