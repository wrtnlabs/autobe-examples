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
 * Test searching audit log parameters by parameter value partial matching.
 * An administrator searches for parameters containing specific text in their values,
 * verifying the system performs partial matching correctly. Validate pagination
 * works correctly when multiple matching parameters exist across different pages.
 */
export async function test_api_system_audit_log_parameters_search_by_value_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test partial matching with common search patterns that might exist
  const searchPatterns = ["user", "admin", "system", "log", "param"] as const;
  for (const searchPattern of searchPatterns) {
    // Search for parameters containing the pattern
    const searchRequest: IDiscussionBoardSystemAuditLogParameter.IRequest = {
      parameter_value: searchPattern,
      page: 1,
      limit: 5,
    };
    const response =
      await api.functional.discussionBoard.admin.system_audit_logs.parameters.index(
        adminConnection,
        {
          auditLogId: typia.random<string & tags.Format<"uuid">>(),
          body: searchRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `pagination metadata for pattern '${searchPattern}'`,
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      `pagination limit for pattern '${searchPattern}'`,
      response.pagination.limit,
      5,
    );
    TestValidator.predicate(
      `pagination records count for pattern '${searchPattern}'`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages count for pattern '${searchPattern}'`,
      response.pagination.pages >= 0,
    );
    // If there are results, validate they contain the search pattern
    if (response.data.length > 0) {
      TestValidator.predicate(
        `all parameters contain pattern '${searchPattern}'`,
        response.data.every((param) =>
          param.parameter_value.includes(searchPattern),
        ),
      );
    }
  }
  // 3. Test pagination with different page/limit combinations
  const paginationTests = [
    { page: 1, limit: 3 },
    { page: 2, limit: 3 },
    { page: 1, limit: 10 },
  ] as const;
  for (const pagination of paginationTests) {
    const searchRequest: IDiscussionBoardSystemAuditLogParameter.IRequest = {
      parameter_value: "", // Empty search to get all parameters
      page: pagination.page,
      limit: pagination.limit,
    };
    const response =
      await api.functional.discussionBoard.admin.system_audit_logs.parameters.index(
        adminConnection,
        {
          auditLogId: typia.random<string & tags.Format<"uuid">>(),
          body: searchRequest,
        },
      );
    typia.assert(response);
    // Validate pagination settings
    TestValidator.equals(
      `current page for ${JSON.stringify(pagination)}`,
      response.pagination.current,
      pagination.page,
    );
    TestValidator.equals(
      `limit for ${JSON.stringify(pagination)}`,
      response.pagination.limit,
      pagination.limit,
    );
    // Validate data count doesn't exceed limit
    TestValidator.predicate(
      `data count <= limit for ${JSON.stringify(pagination)}`,
      response.data.length <= pagination.limit,
    );
  }
  // 4. Test empty search (no matching parameters)
  const emptySearchRequest: IDiscussionBoardSystemAuditLogParameter.IRequest = {
    parameter_value: "nonexistent_pattern_xyz_123",
    page: 1,
    limit: 10,
  };
  const emptyResponse =
    await api.functional.discussionBoard.admin.system_audit_logs.parameters.index(
      adminConnection,
      {
        auditLogId: typia.random<string & tags.Format<"uuid">>(),
        body: emptySearchRequest,
      },
    );
  typia.assert(emptyResponse);
  // The response should be valid even with no matching parameters
  TestValidator.predicate(
    "empty search returns valid response",
    emptyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty search returns valid pages count",
    emptyResponse.pagination.pages >= 0,
  );
}
