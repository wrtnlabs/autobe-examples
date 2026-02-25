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
 * Test the scenario where the administrator attempts to delete a tag that does not exist.
 * This includes:
 * - Administrator joins the system to obtain authorization.
 * - Administrator attempts to delete a tag with a non-existent tagId.
 * - Verify appropriate error response is returned indicating the tag was not found.
 * - Confirm no tag or article-tag mappings are deleted.
 *
 * This test ensures the system correctly handles deletion attempts of
 * non-existent resources with proper error handling and authorization checks.
 */
export async function test_api_tags_erase_nonexistent_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
    },
  });
  typia.assert(administrator);
  // 2. Attempt to erase a tag which does not exist by using a random UUID
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect an error indicating that the tag was not found
  await TestValidator.httpError(
    "administrator attempts to delete a non-existent tag",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.tags.eraseTag(
        adminConnection,
        {
          tagId: nonExistentTagId,
        },
      );
    },
  );
}
