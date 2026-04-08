import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_requests_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super administrator and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Create a new connection with the admin token for API calls
  const adminApiConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 2. Test empty list scenario - verify endpoint returns empty when no requests exist
  const emptyResponse =
    await api.functional.ecommerceMall.superAdministrator.admin_requests.index(
      adminApiConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyResponse);
  // Verify empty result set has correct pagination metadata
  TestValidator.equals(
    "empty scenario pagination records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty scenario pagination pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty scenario data array is empty",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty scenario pagination current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty scenario pagination limit default",
    emptyResponse.pagination.limit,
    20,
  );
  // 3. Test cursor-based pagination edge case with non-existent cursor
  const invalidCursorResponse =
    await api.functional.ecommerceMall.superAdministrator.admin_requests.index(
      adminApiConnection,
      {
        body: { cursor: "00000000-0000-0000-0000-000000000000" },
      },
    );
  typia.assert(invalidCursorResponse);
  // Invalid cursor should return empty array gracefully
  TestValidator.equals(
    "invalid cursor returns empty data",
    invalidCursorResponse.data.length,
    0,
  );
  TestValidator.equals(
    "invalid cursor pagination records",
    invalidCursorResponse.pagination.records,
    0,
  );
  // 4. Test limit boundary with minimum limit (1)
  const minLimitResponse =
    await api.functional.ecommerceMall.superAdministrator.admin_requests.index(
      adminApiConnection,
      {
        body: { limit: 1 },
      },
    );
  typia.assert(minLimitResponse);
  // Validate minimum limit
  TestValidator.equals(
    "min limit=1 pagination limit",
    minLimitResponse.pagination.limit,
    1,
  );
  // 5. Test limit boundary with maximum limit (100)
  const maxLimitResponse =
    await api.functional.ecommerceMall.superAdministrator.admin_requests.index(
      adminApiConnection,
      {
        body: { limit: 100 },
      },
    );
  typia.assert(maxLimitResponse);
  // Validate maximum limit
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 6. Test reason field validation on all returned requests
  // Since we cannot create requests in this test, validate on whatever data exists
  for (const request of maxLimitResponse.data) {
    TestValidator.predicate(
      "reason field is not null",
      request.reason !== null,
    );
    TestValidator.predicate(
      "reason length is within bounds",
      request.reason.length >= 1 && request.reason.length <= 500,
    );
  }
}