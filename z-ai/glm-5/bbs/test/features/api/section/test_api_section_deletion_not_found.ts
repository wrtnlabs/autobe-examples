import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test that attempting to delete a non-existent section returns 404 Not Found error.
 *
 * Test Steps:
 * 1. Create a user connection and authenticate via user join
 * 2. Generate a random UUID that does not correspond to any existing section
 * 3. Call DELETE /discussionBoard/user/sections/{sectionId} with the non-existent section ID
 * 4. Verify the response returns 404 Not Found error
 */
export async function test_api_section_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Generate a non-existent section UUID
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete non-existent section and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent section",
    404,
    async () => {
      await api.functional.discussionBoard.user.sections.erase(userConnection, {
        sectionId: nonExistentSectionId,
      });
    },
  );
}
