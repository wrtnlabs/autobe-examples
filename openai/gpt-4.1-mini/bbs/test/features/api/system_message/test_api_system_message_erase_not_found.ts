import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_message_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test the deletion attempt of a non-existent system message by a superAdministrator.
  // 1) Authenticate as superAdministrator using join operation.
  // 2) Attempt DELETE on /systemMessages/{id} with a valid but non-existent UUID.
  // 3) Expect a 404 Not Found response indicating no such system message exists.
  // 4) Confirm no audit log entries are created for the failed attempt.
  // Create actor-specific connection for superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as superAdministrator using join utility function
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // Use a valid UUID that is almost certainly not present in DB
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent system message and expect 404 error
  await TestValidator.httpError(
    "deleting non-existent system message",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemMessages.erase(
        superAdminConnection,
        { id: nonExistentId },
      );
    },
  );
  // Confirm no audit log entries for the failed deletion attempt
  // Since no API for audit logs is given, this step assumes the system does not
  // crash or throw unexpected errors and the 404 is the expected behavior.
  // Actual audit log verification would require additional API endpoints.
}
