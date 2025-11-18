import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallOrderItemSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that only admin actors can search order item seller mappings.
 *
 * Business goal: Ensure that the PATCH
 * /shoppingMall/admin/orders/{orderCode}/itemSellers endpoint is protected by
 * role-based authorization so that only administrators can use it. Customer and
 * seller actors, even when fully authenticated, must be blocked from accessing
 * this admin-only search API.
 *
 * Test flow:
 *
 * 1. Register a customer (POST /auth/customer/join) and obtain an authenticated
 *    customer connection via the SDK (token is set automatically).
 * 2. With the customer connection, attempt to call
 *    api.functional.shoppingMall.admin.orders.itemSellers.index and verify that
 *    the call fails with an HTTP error (authorization failure).
 * 3. Register a seller (POST /auth/seller/join), again letting the SDK attach the
 *    seller token to the shared connection.
 * 4. With the seller-authenticated connection, attempt to call the same admin
 *    endpoint and verify that it fails with an HTTP error.
 * 5. Register an admin (POST /auth/admin/join). This changes the connection
 *    authorization context to an admin actor.
 * 6. With the admin-authenticated connection, call
 *    api.functional.shoppingMall.admin.orders.itemSellers.index again and
 *    verify that it succeeds, returning a valid
 *    IPageIShoppingMallOrderItemSeller.ISummary payload.
 *
 * Notes:
 *
 * - We do not validate the concrete contents of the page: in many test
 *   environments, there may be no concrete order/item data yet. Instead we only
 *   assert that the response conforms to the expected type and that the request
 *   does not fail when executed as an admin.
 * - For unauthorized calls (customer/seller), we only ensure an error occurs; we
 *   do not assert specific HTTP status codes, in line with E2E guidelines.
 */
export async function test_api_admin_order_item_seller_search_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Register a customer and authenticate as customer
  const customerRequest = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerRequest,
    });
  typia.assert(customer);

  // Try calling admin item seller search as customer
  const orderCodeForTestCustomer: string = typia.random<string>();
  const requestBody: IShoppingMallOrderItemSeller.IRequest =
    typia.random<IShoppingMallOrderItemSeller.IRequest>();

  await TestValidator.error(
    "customer cannot access admin item seller search",
    async () => {
      await api.functional.shoppingMall.admin.orders.itemSellers.index(
        connection,
        {
          orderCode: orderCodeForTestCustomer,
          body: requestBody,
        },
      );
    },
  );

  // 2. Register a seller and authenticate as seller (token is updated on connection)
  const sellerRequest = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerRequest,
    });
  typia.assert(seller);

  // Try calling admin item seller search as seller
  const orderCodeForTestSeller: string = typia.random<string>();
  await TestValidator.error(
    "seller cannot access admin item seller search",
    async () => {
      await api.functional.shoppingMall.admin.orders.itemSellers.index(
        connection,
        {
          orderCode: orderCodeForTestSeller,
          body: requestBody,
        },
      );
    },
  );

  // 3. Register an admin and authenticate as admin
  const adminRequest = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRequest,
    });
  typia.assert(admin);

  // Call the admin endpoint again; it should now succeed
  const orderCodeForAdmin: string = typia.random<string>();
  const page: IPageIShoppingMallOrderItemSeller.ISummary =
    await api.functional.shoppingMall.admin.orders.itemSellers.index(
      connection,
      {
        orderCode: orderCodeForAdmin,
        body: requestBody,
      },
    );

  // Validate the response type structurally
  typia.assert<IPageIShoppingMallOrderItemSeller.ISummary>(page);

  // Basic sanity checks on pagination structure
  TestValidator.predicate(
    "admin search returns non-negative pagination values",
    page.pagination.current >= 0 &&
      page.pagination.limit >= 0 &&
      page.pagination.records >= 0 &&
      page.pagination.pages >= 0,
  );
}
