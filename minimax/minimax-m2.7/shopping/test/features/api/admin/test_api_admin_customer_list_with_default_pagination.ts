import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin retrieving a paginated list of all customers with default pagination settings.
 *
 * Steps:
 * 1. Authenticate as an administrator by submitting an admin request using /ecommerceMall/auth/admin/request to obtain valid admin JWT tokens
 * 2. Send PATCH request to /ecommerceMall/admin/customers with empty request body or default pagination parameters
 * 3. Verify response returns HTTP 200 with paginated customer list
 * 4. Validate response structure: { pagination: { pagination: { current, limit, records, pages }, data: [...] } }
 * 5. Verify each customer in data array contains: id, email, createdAt, updatedAt, deletedAt (null for active), customerProfile
 * 6. Verify customerProfile contains: id, profileType='customer', customerId, displayName, phone, createdAt, updatedAt
 * 7. Verify default sorting is by created_at descending (newest first)
 * 8. Verify default page is 1 and default limit is 20
 * 9. Verify records count reflects total matching customers
 */
export async function test_api_admin_customer_list_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Get customer list with default pagination (empty body)
  const response = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure - pagination is nested under response.pagination.pagination
  const pagination = response.pagination.pagination;
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  TestValidator.equals("default page is 1", pagination.current, 1);
  TestValidator.equals("default limit is 20", pagination.limit, 20);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // 4. Validate customer data structure when data exists
  if (response.data.length > 0) {
    const customer = response.data[0];
    TestValidator.predicate(
      "customer has id",
      customer.id !== undefined && customer.id !== null,
    );
    TestValidator.predicate(
      "customer has email",
      customer.email !== undefined && customer.email !== null,
    );
    TestValidator.predicate(
      "customer has createdAt",
      customer.createdAt !== undefined && customer.createdAt !== null,
    );
    TestValidator.predicate(
      "customer has updatedAt",
      customer.updatedAt !== undefined && customer.updatedAt !== null,
    );
    // Validate customerProfile
    TestValidator.predicate(
      "customerProfile exists",
      customer.customerProfile !== undefined &&
        customer.customerProfile !== null,
    );
    TestValidator.equals(
      "profileType is customer",
      customer.customerProfile.profileType,
      "customer",
    );
    TestValidator.predicate(
      "profile has id",
      customer.customerProfile.id !== undefined &&
        customer.customerProfile.id !== null,
    );
    TestValidator.predicate(
      "profile has customerId",
      customer.customerProfile.customerId !== undefined &&
        customer.customerProfile.customerId !== null,
    );
    TestValidator.predicate(
      "profile has displayName",
      customer.customerProfile.displayName !== undefined &&
        customer.customerProfile.displayName !== null,
    );
  }
  // 5. Validate default sorting (createdAt descending - newest first)
  if (response.data.length >= 2) {
    const firstCustomer = response.data[0];
    const secondCustomer = response.data[1];
    const firstDate = new Date(firstCustomer.createdAt).getTime();
    const secondDate = new Date(secondCustomer.createdAt).getTime();
    TestValidator.predicate(
      "sorted by createdAt descending",
      firstDate >= secondDate,
    );
  }
}
