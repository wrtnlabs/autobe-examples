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

export async function test_api_data_retention_policy_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
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
  // Create a data retention policy
  const createdPolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
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
            "PIPEDA",
            null,
          ] as const),
          is_active: typia.random<boolean>(),
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(createdPolicy);
  // Retrieve the policy using the created policy ID
  const retrievedPolicy =
    await api.functional.discussionBoard.admin.data_retention_policies.at(
      adminConnection,
      {
        policyId: createdPolicy.id,
      },
    );
  typia.assert(retrievedPolicy);
  // Validate that retrieved policy matches created policy
  TestValidator.equals(
    "policy ID matches",
    retrievedPolicy.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "policy name matches",
    retrievedPolicy.policy_name,
    createdPolicy.policy_name,
  );
  TestValidator.equals(
    "description matches",
    retrievedPolicy.description,
    createdPolicy.description,
  );
  TestValidator.equals(
    "retention period matches",
    retrievedPolicy.retention_period_days,
    createdPolicy.retention_period_days,
  );
  TestValidator.equals(
    "retention action matches",
    retrievedPolicy.retention_action,
    createdPolicy.retention_action,
  );
  TestValidator.equals(
    "compliance standard matches",
    retrievedPolicy.compliance_standard,
    createdPolicy.compliance_standard,
  );
  TestValidator.equals(
    "active status matches",
    retrievedPolicy.is_active,
    createdPolicy.is_active,
  );
}
