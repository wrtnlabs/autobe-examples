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

export async function test_api_discussion_board_super_administrator_tag_articles_index_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {} satisfies IDiscussionBoardSuperAdministrator.IJoin,
    },
  );
  // Update connection with access token
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare a random UUID tagId that presumably has no linked articles
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve articles associated with the tag (expect empty list)
  const output =
    await api.functional.discussionBoard.superAdministrator.tags.articles.index(
      superAdminConnection,
      {
        tagId,
      },
    );
  // 4. Assert the output matches expected structure and holds empty data list
  typia.assert(output);
  // Pagination validation
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit > 0,
  );
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
  // Data list should be empty
  TestValidator.equals("data array length", output.data.length, 0);
}
