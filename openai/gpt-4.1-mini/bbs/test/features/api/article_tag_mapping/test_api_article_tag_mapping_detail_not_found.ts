import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_article_tag_mapping_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to retrieve article-tag mapping detail with non-existent mappingId as administrator.
  //
  // Steps:
  // - Authenticate as administrator by joining.
  // - Attempt to retrieve article-tag mapping with a made-up UUID that does not exist.
  //
  // Validations:
  // - Response status is 404 Not Found.
  // - Response body contains an appropriate error message indicating mapping not found.
  // - No unauthorized access errors occur since authentication is valid.
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperSecure123!",
    },
  });
  typia.assert(admin);
  // The token is set internally in adminConnection.headers
  // 2. Attempt to retrieve article-tag mapping with a non-existent UUID
  const fakeMappingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "article-tag mapping detail with non-existent ID returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.article_tag_mappings.atArticleTagMapping(
        adminConnection,
        { mappingId: fakeMappingId },
      );
    },
  );
}
