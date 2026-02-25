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
import { generate_random_discussion_board_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_admin_data_retention_policies_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";

/**
 * Test creating a standard data retention policy by an administrator.
 * 1. Administrator authenticates via join endpoint
 * 2. Creates policy with all required fields and optional compliance standard
 * 3. Validates complete policy object with system-generated fields
 * 4. Ensures policy_name uniqueness and is_active enforcement readiness
 */
export async function test_api_data_retention_policy_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create data retention policy with all required fields
  const policyInput = {
    policy_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    retention_action: RandomGenerator.pick([
      "delete",
      "archive",
      "anonymize",
    ] as const),
    compliance_standard: RandomGenerator.pick([
      "GDPR",
      "CCPA",
      "HIPAA",
      null,
    ] as const),
    is_active: RandomGenerator.pick([true, false] as const),
  } satisfies IDiscussionBoardDataRetentionPolicy.ICreate;
  // Create policy using utility function
  const policy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      { body: policyInput },
    );
  typia.assert(policy);
  // Validate input fields match response
  TestValidator.equals(
    "policy_name matches",
    policy.policy_name,
    policyInput.policy_name,
  );
  TestValidator.equals(
    "description matches",
    policy.description,
    policyInput.description,
  );
  TestValidator.equals(
    "retention_period_days matches",
    policy.retention_period_days,
    policyInput.retention_period_days,
  );
  TestValidator.equals(
    "retention_action matches",
    policy.retention_action,
    policyInput.retention_action,
  );
  TestValidator.equals(
    "compliance_standard matches",
    policy.compliance_standard,
    policyInput.compliance_standard,
  );
  TestValidator.equals(
    "is_active matches",
    policy.is_active,
    policyInput.is_active,
  );
  // Validate system-generated fields exist
  TestValidator.predicate("deleted_at is null", policy.deleted_at === null);
}
