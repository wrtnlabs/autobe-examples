import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of a non-existent password reset record. Create an administrator account,
 * then attempt to retrieve a password reset record with an invalid UUID. Validate that
 * the system returns appropriate error handling for non-existent reset IDs, ensuring
 * proper security and error response mechanisms are in place.
 */
export async function test_api_admin_password_reset_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Attempt to retrieve non-existent password reset record
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that API returns appropriate error for non-existent resource
  await TestValidator.httpError(
    "non-existent password reset ID",
    404,
    async () =>
      await api.functional.discussionBoard.admin.admins.password_resets.at(
        adminConnection,
        { resetId: nonExistentResetId },
      ),
  );
}
