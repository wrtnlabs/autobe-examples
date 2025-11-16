import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate that an administrator can successfully retrieve the detailed record
 * of a specific customer wishlist by its ID.
 *
 * Business context: Only admin users may access another customer's wishlist
 * details for compliance, moderation, or support. The test must ensure proper
 * admin authentication, creation of a real wishlist, strict record matching,
 * and validation that only appropriate fields are exposed.
 *
 * Steps:
 *
 * 1. Register as a customer.
 * 2. Log in as that customer.
 * 3. Create a wishlist as the authenticated customer.
 * 4. Register as an admin.
 * 5. Log in as that admin.
 * 6. Retrieve the wishlist using admin privileges and validate the contents.
 * 7. Confirm that all references (such as customer) are correct and no sensitive
 *    data is present.
 * 8. Attempt retrieval of a random non-existent wishlist ID to verify 404/error
 *    behavior.
 * 9. Attempt access as an unauthorized actor (optional, if feasible) and expect a
 *    permission error.
 */
export async function test_api_admin_wishlist_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register as a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        name: customerName as string & tags.MinLength<2> & tags.MaxLength<64>,
        phone: customerPhone as string & tags.Pattern<"^[0-9\\-+() ]{8,20}$">,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Log in as customer (to prove login works and set session)
  const loggedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://mall.example.com/account/wishlist",
        referrer: "https://mall.example.com/",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(loggedCustomer);

  // 3. Create wishlist as customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);
  TestValidator.equals(
    "wishlist customer reference",
    wishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist customer name reference",
    wishlist.customer.name,
    customer.name,
  );

  // 4. Register as an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14) as string &
    tags.MinLength<8> &
    tags.Format<"password">;
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName as string & tags.MinLength<1>,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 5. Log in as admin
  const loggedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loggedAdmin);

  // 6. Retrieve the wishlist with admin privileges
  const adminWish: IShoppingMallWishlist =
    await api.functional.shoppingMall.admin.wishlists.at(connection, {
      wishlistId: wishlist.id,
    });
  typia.assert(adminWish);

  // 7. Validate returned wishlist matches what was created (ignore timestamps)
  TestValidator.equals("wishlist id matches", adminWish.id, wishlist.id);
  TestValidator.equals(
    "wishlist customer id matches",
    adminWish.customer.id,
    wishlist.customer.id,
  );
  TestValidator.equals(
    "wishlist customer name matches",
    adminWish.customer.name,
    wishlist.customer.name,
  );

  // 8. Try fetching a non-existent wishlistId (should fail gracefully)
  await TestValidator.error(
    "retrieving non-existent wishlist should fail",
    async () => {
      await api.functional.shoppingMall.admin.wishlists.at(connection, {
        wishlistId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
