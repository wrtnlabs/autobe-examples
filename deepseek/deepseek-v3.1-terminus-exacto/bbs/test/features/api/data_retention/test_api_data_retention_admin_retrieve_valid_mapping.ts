import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
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
import { generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create } from "../../../generate/generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";
import { prepare_random_discussion_board_data_retention_policy_data_type } from "../../../prepare/prepare_random_discussion_board_data_retention_policy_data_type";

/**
 * Test the successful retrieval of an existing data retention policy data type mapping by an administrator.
 * Create a data retention policy first, then create a mapping between this policy and a specific data type.
 * Authenticate as an admin user, then call the GET endpoint with the valid mapping ID.
 * Validate that the response includes complete mapping details including the ID, data type, timestamps,
 * and the full retention policy summary with active policy status and compliance standard references.
 * Verify all required fields are present and properly formatted, ensuring the retention policy relationship
 * is correctly populated with summary information.
 */
export async function test_api_data_retention_admin_retrieve_valid_mapping(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create a data retention policy
  const policy =
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
          compliance_standard: typia.random<string | null | undefined>(),
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Create a data type mapping
  const mapping =
    await generate_random_discussion_board_admin_data_retention_policy_data_type_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_data_retention_policy_id: policy.id,
          data_type: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardDataRetentionPolicyDataType.ICreate,
      },
    );
  typia.assert(mapping);
  // Retrieve the mapping using the GET endpoint
  const retrievedMapping =
    await api.functional.discussionBoard.admin.data_retention_policy_data_type_mappings.at(
      adminConnection,
      {
        mappingId: mapping.id,
      },
    );
  typia.assert(retrievedMapping);
  // Validate mapping details
  TestValidator.equals("mapping ID matches", retrievedMapping.id, mapping.id);
  TestValidator.equals(
    "data type matches",
    retrievedMapping.data_type,
    mapping.data_type,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      retrievedMapping.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      retrievedMapping.updated_at,
    ),
  );
  // Validate nullable fields
  TestValidator.predicate(
    "deleted_at is null or valid date-time",
    retrievedMapping.deleted_at === null ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        retrievedMapping.deleted_at,
      ),
  );
  // Validate retention policy relationship
  TestValidator.equals(
    "retention policy ID matches",
    retrievedMapping.retentionPolicy.id,
    policy.id,
  );
  TestValidator.equals(
    "retention policy name matches",
    retrievedMapping.retentionPolicy.policy_name,
    policy.policy_name,
  );
  TestValidator.equals(
    "retention period days matches",
    retrievedMapping.retentionPolicy.retention_period_days,
    policy.retention_period_days,
  );
  TestValidator.equals(
    "retention action matches",
    retrievedMapping.retentionPolicy.retention_action,
    policy.retention_action,
  );
  TestValidator.predicate(
    "retention policy is active",
    retrievedMapping.retentionPolicy.is_active === true,
  );
  // Validate compliance standard (can be string, null, or undefined)
  if (retrievedMapping.retentionPolicy.compliance_standard !== undefined) {
    TestValidator.predicate(
      "compliance standard matches",
      retrievedMapping.retentionPolicy.compliance_standard ===
        policy.compliance_standard,
    );
  }
}
