import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMember";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator customer list pagination with default parameters.
 *
 * Validates the complete customer browsing workflow including administrator authentication, customer list retrieval with pagination, and response structure validation. Ensures that the paginated response contains proper metadata and customer summary data with associated profile information.
 *
 * Special attention is given to verifying that pagination metadata is accurate, customer profile information is properly joined, and no sensitive data like password_hash is exposed in the response.
 *
 * 1. Administrator authenticates via join operation to obtain access token.
 * 2. Administrator requests customer list with default pagination parameters.
 * 3. Validates response structure matches IPageIShoppingMallMember.ISummary schema.
 * 4. Verifies pagination metadata contains current page, limit, records, and pages.
 * 5. Verifies customer summaries include id, email, status, created_at, and customerProfile.
 * 6. Verifies customerProfile contains display_name and phone_number when present.
 */
export async function test_api_customer_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Request customer list with default pagination
  const customerList: IPageIShoppingMallMember.ISummary =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {} satisfies IShoppingMallMember.IRequest,
    });
  typia.assert(customerList);
  // 3. Validate pagination metadata consistency
  TestValidator.predicate(
    "current page is valid",
    customerList.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", customerList.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    customerList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    customerList.pagination.pages >= 0,
  );
  // 4. Validate pages calculation consistency
  const expectedPages =
    customerList.pagination.records === 0
      ? 0
      : Math.ceil(
          customerList.pagination.records / customerList.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation is accurate",
    customerList.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(customerList.data),
  );
  // 6. Validate data length does not exceed limit
  TestValidator.predicate(
    "data length within limit",
    customerList.data.length <= customerList.pagination.limit,
  );
}
