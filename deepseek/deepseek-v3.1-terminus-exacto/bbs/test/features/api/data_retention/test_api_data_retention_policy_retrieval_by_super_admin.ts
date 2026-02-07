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
 * Test that a super administrator can successfully retrieve detailed information
 * about an existing data retention policy.
 */
export async function test_api_data_retention_policy_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve an existing data retention policy
  // Since we don't have a way to create policies via API in this test context,
  // we'll use a randomly generated UUID and test the retrieval functionality
  const policyId = typia.random<string & tags.Format<"uuid">>();
  const retrievedPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.at(
      superAdminConnection,
      {
        policyId: policyId,
      },
    );
  typia.assert(retrievedPolicy);
  // 3. Validate business logic aspects of the retrieved policy
  TestValidator.equals(
    "policy ID matches requested ID",
    retrievedPolicy.id,
    policyId,
  );
  TestValidator.predicate(
    "policy name is meaningful",
    retrievedPolicy.policy_name.length > 0,
  );
  TestValidator.predicate(
    "policy description provides context",
    retrievedPolicy.description.length > 0,
  );
  TestValidator.predicate(
    "retention period is reasonable",
    retrievedPolicy.retention_period_days > 0,
  );
  TestValidator.predicate(
    "retention action is valid",
    ["delete", "archive", "anonymize"].includes(
      retrievedPolicy.retention_action,
    ),
  );
  // Validate timestamp ordering (created_at should be before or equal to updated_at)
  const createdAt = new Date(retrievedPolicy.created_at);
  const updatedAt = new Date(retrievedPolicy.updated_at);
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    createdAt <= updatedAt,
  );
  // Validate optional fields if present
  if (
    retrievedPolicy.last_enforced_at !== null &&
    retrievedPolicy.last_enforced_at !== undefined
  ) {
    const lastEnforcedAt = new Date(retrievedPolicy.last_enforced_at);
    TestValidator.predicate(
      "last_enforced_at is valid timestamp",
      !isNaN(lastEnforcedAt.getTime()),
    );
  }
  if (
    retrievedPolicy.next_enforcement_due !== null &&
    retrievedPolicy.next_enforcement_due !== undefined
  ) {
    const nextEnforcementDue = new Date(retrievedPolicy.next_enforcement_due);
    TestValidator.predicate(
      "next_enforcement_due is valid timestamp",
      !isNaN(nextEnforcementDue.getTime()),
    );
  }
}
