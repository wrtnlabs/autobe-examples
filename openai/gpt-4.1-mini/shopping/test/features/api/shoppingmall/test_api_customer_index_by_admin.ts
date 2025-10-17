import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test retrieving a filtered and paginated list of customers by an admin user.
 *
 * Steps:
 *
 * 1. Admin user signs up (register) with valid credentials.
 * 2. Create a customer user to have data for the listing.
 * 3. Admin retrieves the customer list with filters for nickname, status, and
 *    pagination.
 * 4. Validate the response structure, customer list content, and pagination info.
 */
export async function test_api_customer_index_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user signs up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = `hashedPasswordExample123!`;
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: null,
    phone_number: null,
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a customer user
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: `someHashedPassword123!`,
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(createdCustomer);

  // 3. Admin retrieves the customer list with pagination and filters
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
    status: "active",
    nickname: null,
  } satisfies IShoppingMallCustomer.IRequest;

  const listing: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: requestBody,
    });
  typia.assert(listing);

  // 4. Validate pagination and content
  TestValidator.predicate(
    "pagination current page is correct",
    listing.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    listing.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    listing.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    listing.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "customer list is array",
    Array.isArray(listing.data),
  );
  TestValidator.predicate(
    "created customer is in list",
    listing.data.some((c) => c.id === createdCustomer.id),
  );
}
