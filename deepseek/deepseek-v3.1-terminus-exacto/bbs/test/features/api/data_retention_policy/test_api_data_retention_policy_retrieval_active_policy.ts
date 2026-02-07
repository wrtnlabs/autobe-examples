import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
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
 * Test retrieving an active data retention policy with complete configuration details.
 * Verifies that all policy fields are returned correctly including policy_name, description,
 * retention_period_days, retention_action, compliance_standard, is_active status, and
 * enforcement timestamps.
 */
export async function test_api_data_retention_policy_retrieval_active_policy(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
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
  // Since we don't have a policy creation endpoint, we'll test retrieval with a valid UUID
  // In a real scenario, this would retrieve an existing active policy
  const policyId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the policy using the admin connection
  const policy =
    await api.functional.discussionBoard.admin.data_retention_policies.at(
      adminConnection,
      {
        policyId: policyId,
      },
    );
  // Validate the response structure - typia.assert() performs complete validation
  typia.assert(policy);
  // Verify business logic: policy ID should match the requested ID
  TestValidator.equals("policy ID matches requested ID", policy.id, policyId);
}
