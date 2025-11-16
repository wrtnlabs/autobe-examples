import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin customer drill-down from search results to detail
 * view.
 *
 * Business workflow:
 *
 * 1. Join as platform admin to obtain admin authorization on the shared
 *    connection.
 * 2. Join as customer to create a concrete customer account.
 * 3. As platform admin, search customers with a filter on the customer's email to
 *    obtain an ISummary and capture its id.
 * 4. Call GET detail with that id and validate the IShoppingMallCustomer structure
 *    and consistency with the created customer.
 * 5. Update some customer fields via PUT and verify the response reflects the new
 *    values.
 * 6. Call GET detail again and confirm that the updated values are visible without
 *    needing to repeat the search.
 * 7. Attempt to GET detail with a non-existent customerId and assert that an error
 *    is thrown without checking specific status codes.
 */
export async function test_api_platform_admin_get_customer_detail_after_search(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to set platformAdmin Authorization on connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Join as a new customer (this will overwrite Authorization header
  //    with the customer's token, so we must re-join admin later).
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.test.local/join",
    referrer: "https://shop.test.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Keep key customer facts for later comparison
  const createdCustomerEmail = customerAuthorized.email;
  const createdCustomerName = customerAuthorized.name;

  // 2b. Re-establish platform admin session because customer.join replaced
  // Authorization header with customer token.
  const adminRejoinBody = {
    email: adminJoinBody.email,
    name: adminJoinBody.name,
    password: adminJoinBody.password,
    ip: null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminRejoinBody,
    });
  typia.assert(adminAuthorized2);

  // 3. Search customers by email using PATCH /shoppingMall/platformAdmin/customers
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    email: createdCustomerEmail,
  } satisfies IShoppingMallCustomer.IRequest;

  const searchResult: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result should contain at least one summary entry",
    searchResult.data.length > 0,
  );

  // With exact email filter and uniqueness guarantees, first entry should be our customer.
  const summaryForCustomer = searchResult.data[0];

  const customerIdFromSearch = summaryForCustomer.id;

  // 4. GET detail for the found customer id and validate core fields
  const detail: IShoppingMallCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.at(connection, {
      customerId: customerIdFromSearch,
    });
  typia.assert(detail);

  TestValidator.equals(
    "detail.id should equal search summary id",
    detail.id,
    customerIdFromSearch,
  );

  TestValidator.equals(
    "detail.email should equal created customer email",
    detail.email,
    createdCustomerEmail,
  );

  TestValidator.equals(
    "detail.name should initially match created customer name",
    detail.name,
    createdCustomerName,
  );

  TestValidator.predicate(
    "detail.status should be a non-empty string",
    typeof detail.status === "string" && detail.status.length > 0,
  );

  TestValidator.predicate(
    "detail.isVerified should be a boolean",
    typeof detail.isVerified === "boolean",
  );

  // 5. Update some customer fields using PUT
  const updatedName = `${detail.name} (updated)`;
  const updatedStatus = "suspended";
  const updatedIsVerified = !detail.isVerified;

  const updateBody = {
    name: updatedName,
    status: updatedStatus,
    isVerified: updatedIsVerified,
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedDetail: IShoppingMallCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.update(
      connection,
      {
        customerId: customerIdFromSearch,
        body: updateBody,
      },
    );
  typia.assert(updatedDetail);

  TestValidator.equals(
    "updated detail.id should remain same as customerId",
    updatedDetail.id,
    customerIdFromSearch,
  );

  TestValidator.equals(
    "updated detail.name should reflect new value",
    updatedDetail.name,
    updatedName,
  );

  TestValidator.equals(
    "updated detail.status should reflect new status",
    updatedDetail.status,
    updatedStatus,
  );

  TestValidator.equals(
    "updated detail.isVerified should reflect new flag",
    updatedDetail.isVerified,
    updatedIsVerified,
  );

  // 6. Call GET again and verify it returns the updated state
  const detailReloaded: IShoppingMallCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.at(connection, {
      customerId: customerIdFromSearch,
    });
  typia.assert(detailReloaded);

  TestValidator.equals(
    "reloaded detail should match updated name",
    detailReloaded.name,
    updatedName,
  );

  TestValidator.equals(
    "reloaded detail should match updated status",
    detailReloaded.status,
    updatedStatus,
  );

  TestValidator.equals(
    "reloaded detail should match updated isVerified",
    detailReloaded.isVerified,
    updatedIsVerified,
  );

  // 7. Attempt to fetch a non-existent customerId
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();

  // Ensure we do not accidentally use the real id
  TestValidator.predicate(
    "non-existent customerId should differ from existing id",
    nonExistentCustomerId !== customerIdFromSearch,
  );

  await TestValidator.error(
    "GET detail for non-existent customerId should throw an error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.at(connection, {
        customerId: nonExistentCustomerId,
      });
    },
  );
}
