import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Ensure the wishlist creation endpoint enforces a per-customer quota.
 *
 * Business purpose:
 *
 * - A single customer should only be able to create up to a configured maximum
 *   number of wishlists. Beyond that, the platform must reject additional
 *   wishlist creations with a business error instead of silently accepting
 *   them.
 *
 * What this test validates:
 *
 * 1. A freshly registered (and simulated-verified) customer can create multiple
 *    wishlists via POST /shoppingMall/customer/wishlists.
 * 2. Each successful creation returns a valid IShoppingMallWishlist instance whose
 *    structure matches the DTO and whose customer summary matches the
 *    authenticated customer.
 * 3. All successfully created wishlist IDs are unique.
 * 4. Once an assumed quota (hard-coded in the test) is reached, attempting to
 *    create one more wishlist fails with an error (e.g., business rule
 *    violation), which we validate using TestValidator.error without depending
 *    on specific HTTP status codes or error body structures.
 *
 * Notes on assumptions and rewrites:
 *
 * - The exact numeric quota is not exposed via any configuration or API in the
 *   provided materials. For deterministic testing, this test assumes a small
 *   maximum of 3 wishlists per customer and asserts behavior relative to this
 *   number.
 * - A true email verification token cannot be obtained from the join flow with
 *   the given APIs. To still exercise the verification endpoint and simulate a
 *   verified state, this test calls /auth/customer/email/verify with a random
 *   token payload. In a real environment, the test harness would inject a valid
 *   token instead.
 */
export async function test_api_customer_wishlist_creation_quota_respected(
  connection: api.IConnection,
) {
  // 1. Register a new customer using the join endpoint.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Simulate email verification for this customer.
  const verifyBody = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

  const verifiedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(verifiedCustomer);

  // Use the id from the join response as the canonical customer id for checks.
  const customerId = authorizedCustomer.id;

  // 3. Create wishlists up to the assumed quota.
  const quota = 3;
  const createdWishlists: IShoppingMallWishlist[] = [];

  for (let index = 0; index < quota; index++) {
    const createBody = {
      name: `Wishlist #${index + 1}`,
    } satisfies IShoppingMallWishlist.ICreate;

    const wishlist: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: createBody,
      });
    typia.assert<IShoppingMallWishlist>(wishlist);

    createdWishlists.push(wishlist);
  }

  // 4. Validate invariants across created wishlists.

  // 4-1. All wishlist ids must be unique.
  const ids = createdWishlists.map((w) => w.id);
  const uniqueIds = new Set(ids);
  TestValidator.equals(
    "wishlist ids are unique up to the quota",
    ids.length,
    uniqueIds.size,
  );

  // 4-2. All wishlists must belong to the same customer as the joined account.
  const allBelongToSameCustomer = createdWishlists.every(
    (w) => w.customer.id === customerId,
  );
  TestValidator.predicate(
    "all created wishlists belong to the joined customer",
    allBelongToSameCustomer,
  );

  // 5. Attempt to create one more wishlist beyond the assumed quota and expect
  //    an error, indicating quota enforcement.
  const overQuotaBody = {
    name: "Wishlist over quota",
  } satisfies IShoppingMallWishlist.ICreate;

  await TestValidator.error(
    "creating wishlist beyond quota should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: overQuotaBody,
      });
    },
  );
}
