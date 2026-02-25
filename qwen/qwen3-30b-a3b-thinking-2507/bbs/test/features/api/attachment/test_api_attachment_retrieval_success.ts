import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economic_political_discussion_board_admin_sections_create } from "../../../generate/generate_random_economic_political_discussion_board_admin_sections_create";
import { generate_random_economic_political_discussion_board_user_articles_create } from "../../../generate/generate_random_economic_political_discussion_board_user_articles_create";
import { prepare_random_economic_political_discussion_board_article } from "../../../prepare/prepare_random_economic_political_discussion_board_article";
import { prepare_random_economic_political_discussion_board_attachment } from "../../../prepare/prepare_random_economic_political_discussion_board_attachment";
import { prepare_random_economic_political_discussion_board_section } from "../../../prepare/prepare_random_economic_political_discussion_board_section";

export async function test_api_attachment_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create section
  const section =
    await generate_random_economic_political_discussion_board_admin_sections_create(
      adminConnection,
      {},
    );
  // 3. User setup
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create article
  const article =
    await generate_random_economic_political_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          section_id: section.id,
        },
      },
    );
  // 5. Add attachment
  const attachment =
    await api.functional.economicPoliticalDiscussionBoard.user.articles.attachments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 1,
          sort: "newest",
        },
      },
    );
  // 6. Retrieve attachment
  const retrieved =
    await api.functional.economicPoliticalDiscussionBoard.articles.attachments.at(
      userConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  // 7. Validate
  typia.assert(retrieved);
  TestValidator.equals("URLs match", retrieved.url, attachment.url);
  TestValidator.equals(
    "Attachment type matches",
    retrieved.type,
    attachment.type,
  );
}
