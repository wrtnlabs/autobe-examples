import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin data retention policy search with advanced multi-criteria filtering
 * for compliance auditing.
 *
 * Validates comprehensive search capabilities including partial name matching,
 * exact boolean filters, numeric range filtering, and paginated results.
 * This tests the admin's ability to locate specific retention policies
 * requiring regulatory compliance monitoring.
 */
export async function test_api_admin_data_retention_policies_advanced_filtering_compliance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup with connection isolation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Execute search with comprehensive filter criteria
  const searchBody = {
    policy_name: "audit%",
    enforcement_enabled: true satisfies boolean as boolean,
    compliance_required: true satisfies boolean as boolean,
    retention_period_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<365>
    >(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IMultiUserTodoDataRetentionPolicy.IRequest;
  const result =
    await api.functional.multiUserTodo.admin.data_retention_policies.index(
      adminConnection,
      { body: searchBody },
    );
  typia.assert(result);
  // 3. Validate pagination structure
  typia.assert(result.pagination);
  TestValidator.predicate("has pagination data", result.pagination.current > 0);
  TestValidator.predicate("has valid limit", result.pagination.limit > 0);
  TestValidator.predicate(
    "has valid record count",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("has valid page count", result.pagination.pages >= 0);
  // 4. Verify each returned policy matches all filter criteria
  for (const policy of result.data) {
    typia.assert(policy);
    // Policy name contains 'audit' substring (case-insensitive)
    TestValidator.predicate(
      "policy name contains audit substring",
      policy.policy_name.toLowerCase().includes("audit"),
    );
    // Exact boolean matching
    TestValidator.equals(
      "enforcement enabled matches filter",
      policy.enforcement_enabled,
      true,
    );
    TestValidator.equals(
      "compliance required matches filter",
      policy.compliance_required,
      true,
    );
    // Retention period >= specified minimum
    TestValidator.predicate(
      "retention period meets minimum requirement",
      policy.retention_period_days >= searchBody.retention_period_days!,
    );
  }
  // 5. Validate business logic: combined filtering works
  TestValidator.predicate(
    "all returned policies match composite filter",
    result.data.length === 0 ||
      result.data.every(
        (policy) =>
          policy.policy_name.toLowerCase().includes("audit") &&
          policy.enforcement_enabled === true &&
          policy.compliance_required === true &&
          policy.retention_period_days >= searchBody.retention_period_days!,
      ),
  );
  // 6. Confirm pagination works correctly with filtered results
  TestValidator.predicate(
    "data count respects limit",
    result.data.length <= result.pagination.limit,
  );
}
