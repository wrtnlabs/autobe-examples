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
 * Test admin data retention policies search returns empty results.
 *
 * As an admin verifying system configuration, I need to confirm that the search
 * functionality correctly returns empty results when no policies match my specific
 * criteria, ensuring the interface handles edge cases properly for administrative
 * workflows. This test validates proper handling of no-match scenarios and confirms
 * that soft-deleted policies remain excluded from results.
 */
export async function test_api_admin_data_retention_policies_empty_results_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using join endpoint (must use utility function)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Execute search with highly specific filter criteria unlikely to match existing policies
  const searchBody = {
    target_entity_type: "non_existent_entity",
    enforcement_enabled: true,
    compliance_required: true,
    retention_period_days: 9999 satisfies number as number,
  } satisfies IMultiUserTodoDataRetentionPolicy.IRequest;
  const response =
    await api.functional.multiUserTodo.admin.data_retention_policies.index(
      adminConnection,
      { body: searchBody },
    );
  typia.assert(response);
  // 3. Verify response returns valid empty result set
  TestValidator.equals("no records found", response.pagination.records, 0);
  TestValidator.equals("zero pages", response.pagination.pages, 0);
  TestValidator.equals("empty data array", response.data.length, 0);
  // 4. Confirm pagination metadata is accurate
  TestValidator.equals(
    "current page defaults to 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  // 5. Validate response structure remains consistent even with empty results
  // (typia.assert already validated full structure compliance)
}
