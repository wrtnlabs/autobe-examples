import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import type { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economic_political_discussion_board_user_articles_create } from "../../../generate/generate_random_economic_political_discussion_board_user_articles_create";
import { prepare_random_economic_political_discussion_board_article } from "../../../prepare/prepare_random_economic_political_discussion_board_article";
import { prepare_random_economic_political_discussion_board_attachment } from "../../../prepare/prepare_random_economic_political_discussion_board_attachment";

export async function test_api_article_update_with_tags(
  connection: api.IConnection,
) {
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
  });
  const article =
    await generate_random_economic_political_discussion_board_user_articles_create(
      userConnection,
      {},
    );
  const tags: string[] = [typia.random<string>(), typia.random<string>()];
  const updatedArticle =
    await api.functional.economicPoliticalDiscussionBoard.user.articles.update(
      userConnection,
      {
        articleId: article.id,
        body: {
          tags,
        } satisfies IEconomicPoliticalDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  TestValidator.equals(
    "tags updated successfully",
    updatedArticle.articleTags.map((t) => t.name),
    tags,
  );
}