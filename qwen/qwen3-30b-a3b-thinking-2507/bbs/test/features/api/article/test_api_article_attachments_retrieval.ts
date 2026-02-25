import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import type { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardAttachment";
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

export async function test_api_article_attachments_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user with authorization
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create article with single attachment
  const article =
    await generate_random_economic_political_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.name(2),
          content: RandomGenerator.content({
            paragraphs: 3,
          }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          attachments: [
            {
              url: typia.random<string & tags.Format<"url">>(),
              type: "image" as "image" | "file",
            } satisfies IEconomicPoliticalDiscussionBoardAttachment.ICreate,
          ],
        },
      },
    );
  // 3. Retrieve attachments for the created article
  const attachments =
    await api.functional.economicPoliticalDiscussionBoard.articles.attachments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort: "newest",
        },
      },
    );
  typia.assert(attachments);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    attachments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    attachments.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination total pages",
    attachments.pagination.pages,
    1,
  );
  // 5. Validate attachment data
  const foundAttachment = attachments.data[0];
  TestValidator.equals(
    "attachment URL",
    foundAttachment.url,
    article.attachments[0].url,
  );
  TestValidator.equals(
    "attachment type",
    foundAttachment.type,
    article.attachments[0].type,
  );
  TestValidator.equals(
    "deleted_at should be null",
    foundAttachment.deleted_at,
    null,
  );
  TestValidator.equals(
    "attachment ID",
    foundAttachment.id,
    article.attachments[0].id,
  );
  TestValidator.equals(
    "attachment created_at",
    foundAttachment.created_at,
    article.attachments[0].created_at,
  );
  TestValidator.equals(
    "attachment updated_at",
    foundAttachment.updated_at,
    article.attachments[0].updated_at,
  );
}
