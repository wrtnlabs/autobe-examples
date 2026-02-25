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
import { generate_random_discussion_board_super_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_super_admin_data_retention_policies_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";

export async function test_api_data_retention_policy_creation_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create and authorize super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Create NEW actor-specific connection with updated headers
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedSuperAdmin.token.access },
  };
  // Create data retention policy with comprehensive configuration
  const policy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.create(
      authorizedConnection,
      {
        body: {
          policy_name: "Test GDPR Compliance",
          description: "General Data Protection Regulation compliance policy",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: "delete",
          compliance_standard: "GDPR",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Validate business logic only (no type validation after typia.assert)
  TestValidator.equals(
    "policy name matches input",
    policy.policy_name,
    "Test GDPR Compliance",
  );
  TestValidator.equals(
    "description matches input",
    policy.description,
    "General Data Protection Regulation compliance policy",
  );
  TestValidator.equals(
    "retention action matches input",
    policy.retention_action,
    "delete",
  );
  TestValidator.equals(
    "compliance standard matches input",
    policy.compliance_standard,
    "GDPR",
  );
  TestValidator.equals("is_active matches input", policy.is_active, true);
  TestValidator.predicate(
    "retention period is positive",
    policy.retention_period_days > 0,
  );
}
