import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator customer list browsing with default parameters.
 *
 * Validates the administrative customer browsing endpoint returns properly paginated customer summaries with correct default sorting and filtering behavior. Ensures only active customer accounts are returned by default and pagination metadata is accurate.
 *
 * The test verifies the complete admin authentication flow followed by customer list retrieval with no search filters applied. Default pagination parameters (limit 20, offset 0) and sorting (created_at DESC) should be applied automatically.
 *
 * 1. Administrator registers and authenticates to obtain admin credentials.
 * 2. Administrator calls customer list endpoint with empty request body.
 * 3. Validates response structure includes pagination metadata and customer data array.
 * 4. Validates pagination fields: current page (1), limit (20), total records, total pages.
 * 5. Validates all returned customers are active (deleted_at is null).
 * 6. Validates customer summary fields: id, email, display_name, phone_number, created_at, deleted_at.
 * 7. Validates sorting order (created_at descending - newest first).
 */
export async function test_api_admin_customer_list_browse_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Browse customer list with default parameters
  const customerList = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(customerList);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", customerList.pagination.current, 1);
  TestValidator.equals("limit", customerList.pagination.limit, 20);
  TestValidator.predicate(
    "total records non-negative",
    customerList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    customerList.pagination.pages >= 0,
  );
  // 4. Validate customer data array structure
  TestValidator.predicate("data is array", Array.isArray(customerList.data));
  // 5. Validate all returned customers are active (deleted_at is null)
  await TestValidator.predicate("all customers are active", async () => {
    for (const customer of customerList.data) {
      if (customer.deleted_at !== null) {
        return false;
      }
    }
    return true;
  });
  // 6. Validate sorting order (created_at descending - newest first)
  if (customerList.data.length > 1) {
    const expected = [...customerList.data].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    TestValidator.index(
      "customers sorted by created_at descending",
      expected,
      customerList.data,
    );
  }
  // 7. Validate customer summary structure with typia
  for (const customer of customerList.data) {
    typia.assert(customer);
  }
}
