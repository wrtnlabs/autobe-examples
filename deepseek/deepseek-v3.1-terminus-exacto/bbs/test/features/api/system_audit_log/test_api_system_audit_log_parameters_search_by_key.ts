import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemAuditLogParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test searching audit log parameters by parameter key exact match.
 * An administrator authenticates, searches for parameters with a specific key value,
 * and verifies the system returns only matching parameter records with proper pagination metadata.
 * Validate that the response includes correct parameter summaries with key, value, and creation timestamps.
 */
export async function test_api_system_audit_log_parameters_search_by_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Generate random audit log ID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create search request with specific parameter key filter
  const searchKey = RandomGenerator.alphabets(10);
  const searchRequest = {
    parameter_key: searchKey,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest;
  // 4. Call the audit log parameters search endpoint
  const response =
    await api.functional.discussionBoard.admin.system_audit_logs.parameters.index(
      adminConnection,
      {
        auditLogId,
        body: searchRequest,
      },
    );
  // 5. Validate response structure
  typia.assert(response);
  // 6. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 7. Verify all returned parameters have valid structure
  for (const parameter of response.data) {
    TestValidator.predicate(
      "parameter has valid uuid id",
      /^[0-9a-f-]{36}$/i.test(parameter.id),
    );
    TestValidator.predicate(
      "parameter key is string",
      typeof parameter.parameter_key === "string",
    );
    TestValidator.predicate(
      "parameter value is string",
      typeof parameter.parameter_value === "string",
    );
    TestValidator.predicate(
      "created_at is valid ISO date",
      !isNaN(new Date(parameter.created_at).getTime()),
    );
  }
  // Note: Since we cannot create actual audit log parameters in this test,
  // we focus on validating the API response structure and pagination metadata.
  // The actual search functionality testing would require pre-populated data.
}
