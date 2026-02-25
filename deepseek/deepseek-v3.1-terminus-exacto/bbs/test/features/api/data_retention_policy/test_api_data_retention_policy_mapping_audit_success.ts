import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
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

export async function test_api_data_retention_policy_mapping_audit_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin
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
  // Retrieve data retention policy mapping
  const mapping =
    await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.at(
      superAdminConnection,
      {
        mappingId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(mapping);
  // Validate that retention policy details are properly nested
  TestValidator.predicate(
    "retention policy is properly linked",
    mapping.retentionPolicy !== null && mapping.retentionPolicy !== undefined,
  );
  // Validate business logic: retention period should be positive
  TestValidator.predicate(
    "retention period is positive",
    mapping.retentionPolicy.retention_period_days > 0,
  );
  // Validate business logic: policy should have a name
  TestValidator.predicate(
    "policy has a name",
    mapping.retentionPolicy.policy_name.length > 0,
  );
  // Validate business logic: retention action is defined
  TestValidator.predicate(
    "retention action is defined",
    mapping.retentionPolicy.retention_action.length > 0,
  );
}
