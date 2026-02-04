import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import type { IEconPoliticBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleTag";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_econ_politic_board_member_articles_create } from "../../../generate/generate_random_econ_politic_board_member_articles_create";
import { prepare_random_econ_politic_board_article } from "../../../prepare/prepare_random_econ_politic_board_article";

export async function test_api_article_tag_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with the provided utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies IEconPoliticBoardMember.IJoin,
  });
  // 2. Create an article using the member connection
  const article: IEconPoliticBoardArticle =
    await generate_random_econ_politic_board_member_articles_create(
      memberConnection,
      {
        body: {} satisfies IEconPoliticBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Generate 3 valid tags following business rules (max 20 chars, only letters/spaces)
  const tags = ["Economic Policy", "Political Analysis", "Market Trends"];
  // 4. Update article tags with the new ones
  const response: IEconPoliticBoardArticleTag.ISummary =
    await api.functional.econPoliticBoard.articles.tags.update(
      memberConnection,
      {
        articleId: (article as IEconPoliticBoardArticle & { id: string }).id,
        body: {
          tags: tags satisfies (string &
            tags.MaxLength<20> &
            tags.Pattern<"[a-zA-Z ]+">)[],
        } satisfies IEconPoliticBoardArticle.IUpdateTag,
      },
    );
  typia.assert(response);
  // 5. Verify the tag update was successful
  TestValidator.equals(
    "First tag updated successfully",
    response.value,
    tags[0],
  );
}