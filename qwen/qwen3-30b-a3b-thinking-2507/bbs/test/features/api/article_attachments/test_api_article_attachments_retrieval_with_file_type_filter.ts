import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import type { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import type { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardArticleAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economy_politics_board_user_articles_create } from "../../../generate/generate_random_economy_politics_board_user_articles_create";
import { prepare_random_economy_politics_board_article } from "../../../prepare/prepare_random_economy_politics_board_article";

export async function test_api_article_attachments_retrieval_with_file_type_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. User setup with authorization (using random password)
  const userConnection: api.IConnection = { host: connection.host };
  const password = "testpassword123";
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create an article
  const article =
    await generate_random_economy_politics_board_user_articles_create(
      userConnection,
      {},
    );
  // 3. Retrieve all attachments (to establish a baseline for testing)
  const allAttachments =
    await api.functional.economyPoliticsBoard.articles.attachments.index(
      userConnection,
      {
        articleId: article.id,
        body: {} satisfies IEconomyPoliticsBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(allAttachments);
  // 4. Retrieve filtered attachments (by file_type)
  const filteredAttachments =
    await api.functional.economyPoliticsBoard.articles.attachments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          file_type: "image/jpeg",
        } satisfies IEconomyPoliticsBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(filteredAttachments);
  // Verify there are attachments to filter (must have at least one)
  TestValidator.predicate(
    "There are attachments to filter",
    allAttachments.data.length > 0,
  );
  // Verify filtering actually returned some data
  TestValidator.predicate(
    "Filter returned at least 1 attachment",
    filteredAttachments.data.length > 0,
  );
  // Verify that only image/jpeg attachments were returned
  TestValidator.predicate(
    "Only JPEG attachments returned",
    filteredAttachments.data.every(
      (attachment) => attachment.file_type === "image/jpeg",
    ),
  );
  // Verify that filtered list is smaller than the full list (ensures filtering worked)
  TestValidator.predicate(
    "Filtered attachments are fewer than all",
    filteredAttachments.data.length < allAttachments.data.length,
  );
}
