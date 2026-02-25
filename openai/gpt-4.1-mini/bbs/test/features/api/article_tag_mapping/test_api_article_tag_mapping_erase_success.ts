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

/**
 * Test deleting an existing article-tag mapping by its mappingId as an authorized administrator.
 *
 * Steps:
 * 1. Register a new administrator using the authorized join utility.
 * 2. Create a dummy article-tag mapping directly using SDK or simulate its existence.
 *    (Since no create API provided for article-tag-mappings, simulate mappingId.)
 * 3. Perform deletion using the erase API utility.
 * 4. Confirm no error occurs and deletion is successful (status 204 No Content).
 * 5. Verify deletion by attempting to erase the same mapping again and expect error.
 */
export async function test_api_article_tag_mapping_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(admin);
  // 2. Generate a random UUID mappingId to simulate existing mapping
  const mappingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform erase with the valid mappingId - expected success, no content
  await api.functional.discussionBoard.administrator.article_tag_mappings.erase(
    adminConnection,
    { mappingId },
  );
  // 4. Verify that deleting again throws error (because it no longer exists)
  await TestValidator.error(
    "deleting non-existent article-tag mapping should throw error",
    async () => {
      await api.functional.discussionBoard.administrator.article_tag_mappings.erase(
        adminConnection,
        { mappingId },
      );
    },
  );
}
