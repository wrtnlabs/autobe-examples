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

export async function test_api_customer_wishlist_rename_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 2. Create an initial wishlist for this customer
  const initialWishlistName: string = RandomGenerator.paragraph({
    sentences: 3,
  });

  const createBody = {
    name: initialWishlistName,
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallWishlist>(createdWishlist);

  const originalId = createdWishlist.id;
  const originalName = createdWishlist.name;
  const originalIsDefault = createdWishlist.isDefault;
  const originalCustomer = createdWishlist.customer;
  const originalCreatedAt = createdWishlist.createdAt;
  const originalUpdatedAt = createdWishlist.updatedAt;

  // Sanity checks on the initially created wishlist
  TestValidator.equals(
    "created wishlist id must equal itself",
    createdWishlist.id,
    originalId,
  );
  TestValidator.equals(
    "created wishlist name must equal requested name",
    createdWishlist.name,
    initialWishlistName,
  );

  // 3. Prepare a new name for the wishlist and ensure it's different
  const newWishlistName: string = RandomGenerator.paragraph({
    sentences: 2,
  });

  TestValidator.notEquals(
    "new wishlist name should differ from original name",
    newWishlistName,
    originalName,
  );

  // 4. Call the wishlist update endpoint to rename the wishlist
  const updateBody = {
    name: newWishlistName,
  } satisfies IShoppingMallWishlist.IUpdate;

  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: originalId,
      body: updateBody,
    });
  typia.assert<IShoppingMallWishlist>(updatedWishlist);

  // 5. Validate that the rename took effect and invariants hold
  TestValidator.equals(
    "wishlist id remains the same after rename",
    updatedWishlist.id,
    originalId,
  );

  TestValidator.equals(
    "wishlist customer ownership unchanged after rename",
    updatedWishlist.customer,
    originalCustomer,
  );

  TestValidator.equals(
    "wishlist default flag unchanged after rename",
    updatedWishlist.isDefault,
    originalIsDefault,
  );

  TestValidator.notEquals(
    "wishlist name changed after rename",
    updatedWishlist.name,
    originalName,
  );

  TestValidator.equals(
    "wishlist name equals new requested name",
    updatedWishlist.name,
    newWishlistName,
  );

  TestValidator.equals(
    "wishlist createdAt unchanged after rename",
    updatedWishlist.createdAt,
    originalCreatedAt,
  );

  // Compare updatedAt timestamps to ensure it moved forward or stayed the same
  const originalUpdatedAtDate = new Date(originalUpdatedAt);
  const updatedUpdatedAtDate = new Date(updatedWishlist.updatedAt);
  TestValidator.predicate(
    "wishlist updatedAt is not earlier than original after rename",
    updatedUpdatedAtDate.getTime() >= originalUpdatedAtDate.getTime(),
  );
}
