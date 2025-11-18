import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Ensure that only authenticated admin actors can list administrator accounts.
 *
 * Business context:
 *
 * - The PATCH /shoppingMall/admin/admins endpoint returns a paginated list of
 *   admin summaries and is restricted to the `admin` authorizationActor.
 * - Customer, seller, guestUser actors and anonymous clients must not be able to
 *   access this listing.
 *
 * Test workflow:
 *
 * 1. Create an admin (Admin A) via POST /auth/admin/join. This also authenticates
 *    the connection as that admin because the SDK writes output.token.access
 *    into connection.headers.Authorization.
 * 2. Call PATCH /shoppingMall/admin/admins with a minimal valid search body (e.g.,
 *    empty pagination / filters) and assert success, validating the
 *    IPageIShoppingMallAdmin.ISummary structure with typia.assert.
 * 3. Derive an unauthenticated connection from the original by copying it and
 *    setting headers to an empty object. Using this unauthenticated connection,
 *    attempt to call PATCH /shoppingMall/admin/admins and expect it to fail.
 * 4. Register a customer via POST /auth/customer/join. The SDK will update the
 *    original connection headers to a customer token. Using this customer-
 *    authenticated connection, attempt PATCH /shoppingMall/admin/admins and
 *    assert that it throws.
 * 5. Register a seller via POST /auth/seller/join. The headers will now carry a
 *    seller token. Again, attempt PATCH /shoppingMall/admin/admins and assert
 *    that it throws.
 * 6. Register a guest user via POST /auth/guestUser/join, which writes a guestUser
 *    token into the headers. Attempt PATCH /shoppingMall/admin/admins and
 *    assert that it throws.
 * 7. Finally, re-authenticate as an admin by calling POST /auth/admin/join again.
 *    Call PATCH /shoppingMall/admin/admins once more and assert success.
 *
 * Implementation notes and constraints:
 *
 * - Use typia.random<IShoppingMallAdminJoin.ICreate>() and similar DTOs for
 *   request bodies to satisfy schemas.
 * - For all positive responses, immediately call typia.assert on the result,
 *   which fully validates the structure including pagination.
 * - For negative cases, use await TestValidator.error("title", async () => { ...
 *   }) and do not inspect status codes.
 * - Do not add imports or touch connection.headers directly in any way other than
 *   via the SDK functions that set Authorization automatically, except for
 *   creating a separate unauthenticated connection with empty headers.
 */
export async function test_api_admin_list_requires_admin_role(
  connection: api.IConnection,
) {
  // 1. Create and authenticate Admin A
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Successful admin listing with admin token
  const adminListPage: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(adminListPage);

  // Basic pagination sanity check
  TestValidator.predicate(
    "admin list pagination has non-negative current page",
    adminListPage.pagination.current >= 0,
  );

  // 3. Anonymous client should be rejected
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("anonymous client cannot list admins", async () => {
    await api.functional.shoppingMall.admin.admins.index(anonymousConnection, {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    });
  });

  // 4. Customer join, then attempt admin listing with customer token
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  await TestValidator.error("customer actor cannot list admins", async () => {
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    });
  });

  // 5. Seller join, then attempt admin listing with seller token
  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  await TestValidator.error("seller actor cannot list admins", async () => {
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    });
  });

  // 6. Guest user join, then attempt admin listing with guest token
  const guestJoinBody = typia.random<IShoppingMallGuestUser.IJoin>();
  const guestAuthorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinBody,
    });
  typia.assert(guestAuthorized);

  await TestValidator.error("guestUser actor cannot list admins", async () => {
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    });
  });

  // 7. Re-authenticate as admin and ensure listing succeeds again
  const secondAdminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const secondAdminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: secondAdminJoinBody,
    });
  typia.assert(secondAdminAuthorized);

  const finalAdminListPage: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(finalAdminListPage);

  TestValidator.predicate(
    "final admin list has non-negative record count",
    finalAdminListPage.pagination.records >= 0,
  );
}
