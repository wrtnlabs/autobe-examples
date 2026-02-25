import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_article_tag_mapping_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deleting a non-existent article-tag mapping by a random mappingId as an authorized administrator.
  // 1. Authenticate as administrator via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // Inject admin authorization token into adminConnection headers for authenticated requests
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${admin.token.access}`;
  // 2. Generate a random UUID for a non-existent article-tag mapping
  const randomMappingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete this non-existent article-tag mapping and expect an error
  await TestValidator.error(
    "delete non-existent article-tag mapping",
    async () => {
      await api.functional.discussionBoard.administrator.article_tag_mappings.erase(
        adminConnection,
        { mappingId: randomMappingId },
      );
    },
  );
}
