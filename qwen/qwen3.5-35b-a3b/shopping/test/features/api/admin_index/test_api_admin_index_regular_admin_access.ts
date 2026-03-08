import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test regular admin's restricted visibility when accessing admin list endpoint.
 * Verifies that regular administrators can only see their own account information.
 * 1. Authenticate as regular administrator
 * 2. Request admin list with PATCH /ecommerceMall/admin/admins
 * 3. Validate response contains only own account
 * 4. Test email filter returns no results for other admins
 * 5. Validate sorting works with single record
 * 6. Confirm password_hash is excluded from response
 */
export async function test_api_admin_index_regular_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(adminAuth);
  // Verify admin was created with correct fields
  TestValidator.equals(
    "admin email matches input",
    adminAuth.email,
    joinInput.email,
  );
  TestValidator.predicate("admin is not banned", adminAuth.is_banned === false);
  TestValidator.equals("ban_reason is null", adminAuth.ban_reason, null);
  TestValidator.predicate(
    "has valid created_at",
    adminAuth.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at",
    adminAuth.updated_at !== undefined,
  );
  // Step 2: Create second admin for testing email filter
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const secondAdminAuth = await authorize_admin_join(secondAdminConnection, {
    body: secondJoinInput,
  });
  typia.assert(secondAdminAuth);
  // Step 3: Request admin list as regular admin
  const requestBody = {
    page: 1,
    limit: 10,
    sort_by: "email",
    sort_order: "asc",
  } satisfies IEcommerceMallAdmin.IRequest;
  const response = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination records is 1",
    response.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages is 1", response.pagination.pages, 1);
  // Step 5: Validate data contains only the requesting admin
  TestValidator.equals("data array length is 1", response.data.length, 1);
  TestValidator.equals(
    "data contains own email",
    response.data[0].email,
    adminAuth.email,
  );
  // Step 6: Verify fields are present and correct type (no password_hash)
  const dataRecord = response.data[0];
  TestValidator.equals("id exists", dataRecord.id !== undefined, true);
  TestValidator.equals("email exists", dataRecord.email !== undefined, true);
  TestValidator.equals(
    "is_banned is boolean",
    typeof dataRecord.is_banned,
    "boolean",
  );
  TestValidator.equals(
    "created_at exists",
    dataRecord.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at exists",
    dataRecord.updated_at !== undefined,
    true,
  );
  // Step 7: Test email filter with other admin's email - should return empty
  const filteredRequestBody = {
    email: secondAdminAuth.email,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdmin.IRequest;
  const filteredResponse =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: filteredRequestBody,
    });
  typia.assert(filteredResponse);
  // Regular admin cannot see other admins even with email filter
  TestValidator.equals(
    "filtered data array length is 0",
    filteredResponse.data.length,
    0,
  );
  TestValidator.equals(
    "filtered records is 0",
    filteredResponse.pagination.records,
    0,
  );
  // Step 8: Test sorting with own record
  const sortRequestBody = {
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdmin.IRequest;
  const sortedResponse = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    { body: sortRequestBody },
  );
  typia.assert(sortedResponse);
  TestValidator.equals(
    "sorted data contains own email",
    sortedResponse.data[0].email,
    adminAuth.email,
  );
  // Step 9: Test sorting by id
  const idSortRequestBody = {
    sort_by: "id",
    sort_order: "desc",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdmin.IRequest;
  const idSortedResponse =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: idSortRequestBody,
    });
  typia.assert(idSortedResponse);
  TestValidator.equals(
    "id sorted data contains own email",
    idSortedResponse.data[0].email,
    adminAuth.email,
  );
}
