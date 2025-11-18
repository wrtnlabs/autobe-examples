import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate happy-path retrieval of a customer-owned wishlist detail.
 *
 * Business flow:
 *
 * 1. Register a new customer (join) to obtain an authenticated customer context.
 * 2. Create a wishlist as that customer, storing the returned wishlist as the
 *    source of truth for all expected fields.
 * 3. Retrieve the wishlist detail by its id using the customer detail endpoint.
 * 4. Assert that the detail response matches the created wishlist and that the
 *    embedded customer summary corresponds to the same customer.
 */
export async function test_api_customer_wishlist_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register (join) a customer to establish authentication context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional; let server derive or accept null
    ip: null,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  // 2. Create a wishlist for this authenticated customer
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    // Let is_default be explicitly true to make expectations clear
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert(createdWishlist);

  // Basic sanity checks on created wishlist
  TestValidator.equals(
    "created wishlist belongs to joined customer",
    createdWishlist.customer.id,
    customer.id,
  );

  // 3. Retrieve wishlist detail by id
  const detailedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: createdWishlist.id,
    });
  typia.assert(detailedWishlist);

  // 4. Validate identity consistency and core field equality
  TestValidator.equals(
    "wishlist id should match between create and detail",
    detailedWishlist.id,
    createdWishlist.id,
  );
  TestValidator.equals(
    "wishlist name should match between create and detail",
    detailedWishlist.name,
    createdWishlist.name,
  );
  TestValidator.equals(
    "wishlist description should match between create and detail",
    detailedWishlist.description ?? null,
    createdWishlist.description ?? null,
  );
  TestValidator.equals(
    "wishlist is_default should match between create and detail",
    detailedWishlist.is_default,
    createdWishlist.is_default,
  );
  TestValidator.equals(
    "wishlist status should match between create and detail",
    detailedWishlist.status,
    createdWishlist.status,
  );
  TestValidator.equals(
    "wishlist created_at should match between create and detail",
    detailedWishlist.created_at,
    createdWishlist.created_at,
  );
  TestValidator.equals(
    "wishlist updated_at should match between create and detail",
    detailedWishlist.updated_at,
    createdWishlist.updated_at,
  );
  TestValidator.equals(
    "wishlist deleted_at should match between create and detail",
    detailedWishlist.deleted_at ?? null,
    createdWishlist.deleted_at ?? null,
  );

  // 5. Validate embedded customer summary matches joined customer
  TestValidator.equals(
    "detail customer id should match joined customer",
    detailedWishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "detail customer email should match joined customer",
    detailedWishlist.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "detail customer status should match joined customer",
    detailedWishlist.customer.status,
    customer.status,
  );
  TestValidator.equals(
    "detail customer email_verified should match joined customer",
    detailedWishlist.customer.email_verified,
    customer.email_verified,
  );
  TestValidator.equals(
    "detail customer created_at should match joined customer",
    detailedWishlist.customer.created_at,
    customer.created_at,
  );
  TestValidator.equals(
    "detail customer updated_at should match joined customer",
    detailedWishlist.customer.updated_at,
    customer.updated_at,
  );
  TestValidator.equals(
    "detail customer deleted_at should match joined customer",
    detailedWishlist.customer.deleted_at ?? null,
    customer.deleted_at ?? null,
  );
}
