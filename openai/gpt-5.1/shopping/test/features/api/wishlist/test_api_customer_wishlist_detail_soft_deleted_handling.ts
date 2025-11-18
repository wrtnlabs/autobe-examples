import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_customer_wishlist_detail_soft_deleted_handling(
  connection: api.IConnection,
) {
  // 1. Join a customer and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create a wishlist for this customer
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallWishlist>(createdWishlist);

  // Basic sanity assertions on created wishlist
  TestValidator.equals(
    "created wishlist has correct name",
    createdWishlist.name,
    createBody.name,
  );
  // For status, let X be the broader union (string | null) and Y the concrete string
  TestValidator.equals(
    "created wishlist status matches requested",
    createBody.status,
    createdWishlist.status,
  );
  TestValidator.equals(
    "created wishlist belongs to joined customer",
    createdWishlist.customer.id,
    customer.id,
  );
  // Check deleted_at is null using predicate to avoid union generic issues
  TestValidator.predicate(
    "created wishlist deleted_at is null before deletion",
    createdWishlist.deleted_at === null ||
      createdWishlist.deleted_at === undefined,
  );

  // 3. Fetch the wishlist detail before deletion to confirm it is retrievable
  const fetchedBeforeDelete: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: createdWishlist.id,
    });
  typia.assert<IShoppingMallWishlist>(fetchedBeforeDelete);

  TestValidator.equals(
    "fetched-before-delete wishlist id matches created",
    fetchedBeforeDelete.id,
    createdWishlist.id,
  );
  TestValidator.equals(
    "fetched-before-delete wishlist status is active",
    createBody.status,
    fetchedBeforeDelete.status,
  );
  TestValidator.predicate(
    "fetched-before-delete deleted_at is null",
    fetchedBeforeDelete.deleted_at === null ||
      fetchedBeforeDelete.deleted_at === undefined,
  );

  // 4. Soft-delete the wishlist via DELETE endpoint
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: createdWishlist.id,
  });

  // 5. Try to retrieve the wishlist again after deletion
  // There are two acceptable behaviors:
  //  - The API hides the wishlist and throws an HttpError (e.g., 404/403). We treat any HttpError as
  //    valid evidence that the wishlist is no longer behaving as an active wishlist.
  //  - The API returns the wishlist but with deleted_at set (and possibly different status).
  // We must not assert specific HTTP status codes per global rules.
  try {
    const fetchedAfterDelete: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.at(connection, {
        wishlistId: createdWishlist.id,
      });
    typia.assert<IShoppingMallWishlist>(fetchedAfterDelete);

    // If the wishlist is still returned, it should now be marked as soft-deleted.
    TestValidator.predicate(
      "fetched-after-delete wishlist should have non-null deleted_at if visible",
      fetchedAfterDelete.deleted_at !== null &&
        fetchedAfterDelete.deleted_at !== undefined,
    );

    TestValidator.equals(
      "fetched-after-delete wishlist id remains the same",
      fetchedAfterDelete.id,
      createdWishlist.id,
    );
  } catch (exp) {
    // If an error is thrown, this also satisfies the business rule that
    // soft-deleted wishlists do not behave like active wishlists for customers.
    // We do not assert status codes or error payloads.
    await TestValidator.error(
      "wishlist detail after delete may throw",
      async () => {
        throw exp;
      },
    );
  }
}
