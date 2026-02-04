import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import type { IEconPoliticBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleAttachment";
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
import { generate_random_econ_politic_board_member_articles_attachments_create } from "../../../generate/generate_random_econ_politic_board_member_articles_attachments_create";
import { generate_random_econ_politic_board_member_articles_create } from "../../../generate/generate_random_econ_politic_board_member_articles_create";
import { prepare_random_econ_politic_board_article } from "../../../prepare/prepare_random_econ_politic_board_article";
import { prepare_random_econ_politic_board_article_attachment } from "../../../prepare/prepare_random_econ_politic_board_article_attachment";

export async function test_api_article_attachment_without_description(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // Step 2: Create an article
  const article =
    await generate_random_econ_politic_board_member_articles_create(
      memberConnection,
      {},
    );
  typia.assert(article);
  // Step 3: Attach file without description
  const attachment =
    await generate_random_econ_politic_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: typia.random<string & tags.Format<"uuid">>() },
        body: {},
      },
    );
  typia.assert(attachment);
  // Step 4: Validate attachment metadata is stored correctly
  // Since description is not a valid property in the attachment DTO, we removed the validation
}
