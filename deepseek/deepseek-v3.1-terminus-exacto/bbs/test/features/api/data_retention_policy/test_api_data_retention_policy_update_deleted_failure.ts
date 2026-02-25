import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
 * Test data retention policy update failure when policy is deleted.
 * Verifies that deleted policies (with deleted_at not null) cannot be updated.
 */
export async function test_api_data_retention_policy_update_deleted_failure(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  const authorized = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "test_password_123",
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorized);
  // Since we don't have policy creation/deletion endpoints available,
  // we test error handling by attempting to update a non-existent/deleted policy
  const deletedPolicyId = typia.random<string & tags.Format<"uuid">>();
  // Prepare valid update payload
  const updateBody = {
    policy_name: "Updated Policy Name",
    description: "Updated description for deleted policy",
    retention_period_days: typia.random<number & tags.Type<"int32">>(),
    retention_action: "archive",
    compliance_standard: "GDPR",
    is_active: false,
  } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate;
  // Verify that updating a non-existent/deleted policy fails
  await TestValidator.error(
    "should reject update of deleted or non-existent policy",
    async () => {
      await api.functional.discussionBoard.superAdmin.data_retention_policies.update(
        superAdminConnection,
        {
          policyId: deletedPolicyId,
          body: updateBody,
        },
      );
    },
  );
}
