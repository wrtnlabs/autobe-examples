import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
 * Test the behavior when attempting to retrieve a data retention policy that does not exist in the system.
 * Verifies that the API returns an appropriate error response when provided with a valid UUID format
 * that does not correspond to any existing policy.
 */
export async function test_api_data_retention_policy_retrieval_non_existent_policy(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a valid UUID that does not exist in the system
  const nonExistentPolicyId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent policy and verify it fails with 404 Not Found
  await TestValidator.httpError(
    "retrieving non-existent policy should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.data_retention_policies.at(
        superAdminConnection,
        {
          policyId: nonExistentPolicyId,
        },
      );
    },
  );
}
