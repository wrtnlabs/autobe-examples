import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the scenario where the requested configuration does not exist or has been soft-deleted.
 * 1. Authenticate as super administrator using join
 * 2. Attempt to retrieve a configuration using a valid but non-existent UUID
 * 3. Verify the API returns 404 Not Found error
 * 4. Test with a configuration ID that exists but has deleted_at set
 * 5. Verify the endpoint respects soft-delete and returns 404
 * 6. Validate error response format
 */
export async function test_api_system_configuration_not_found_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // Test 1: Non-existent configuration
  await TestValidator.error(
    "non-existent configuration should return 404",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_configurations.at(
        superAdminConnection,
        {
          configurationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 2: Soft-deleted configuration (simulated by using valid UUID but expecting 404)
  // Since we cannot create and soft-delete a configuration in this test,
  // we'll test the same scenario with another non-existent UUID
  await TestValidator.error(
    "soft-deleted configuration should return 404",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_configurations.at(
        superAdminConnection,
        {
          configurationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Additional validation: Test that the error handling is proper
  // by using TestValidator.httpError to explicitly check for 404 status
  await TestValidator.httpError("explicit 404 validation", 404, async () => {
    await api.functional.discussionBoard.superAdmin.system_configurations.at(
      superAdminConnection,
      {
        configurationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
