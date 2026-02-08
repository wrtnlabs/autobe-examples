import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_super_administrator_tag_articles_index_tag_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Base connection to host is received.
  // 2. Register and authenticate super administrator.
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Since IDiscussionBoardSuperAdministrator.IJoin type is an empty object, we can pass an empty object literally
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // 3. Create a new connection which carries the bearer authorization header.
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // 4. Generate a random valid but non-existent tag UUID
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve articles for this non-existent tag. It should throw 404.
  await TestValidator.httpError(
    "request with non-existent tag UUID fails with 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.tags.articles.index(
        authConnection,
        {
          tagId: nonExistentTagId,
        },
      );
    },
  );
}
