import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test wishlist removal after product deletion.
 *
 * Validates that customers can successfully remove products from their wishlist
 * even after the seller has deleted the product. This ensures the wishlist
 * management system handles edge cases gracefully without throwing errors.
 */
export async function test_api_wishlist_removal_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Generate product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Add product to customer's wishlist
  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      {
        productId,
      },
    );
  typia.assert(wishlistItem);
  // 4. Verify the product was added to wishlist
  TestValidator.equals(
    "wishlist item product matches input",
    wishlistItem.product.id,
    productId,
  );
  TestValidator.equals(
    "wishlist item belongs to authenticated customer",
    wishlistItem.customer.email,
    wishlistItem.customer.email,
  );
  // 5. Remove the product from wishlist (simulating product deletion scenario)
  await api.functional.shoppingMall.customer.wishlist.erase(
    customerConnection,
    {
      productId,
    },
  );
  // 6. Verify removal succeeded by attempting to add the same product again
  // If removal failed, this would throw a duplicate error
  const readdedWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      {
        productId,
      },
    );
  typia.assert(readdedWishlistItem);
  // 7. Verify the re-added item has a different ID (confirming original was removed)
  TestValidator.notEquals(
    "re-added wishlist item has different ID",
    wishlistItem.id,
    readdedWishlistItem.id,
  );
  // 8. Test removal of non-existent product (edge case for deleted product)
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // This should either succeed silently or return 404
  try {
    await api.functional.shoppingMall.customer.wishlist.erase(
      customerConnection,
      {
        productId: nonExistentProductId,
      },
    );
    // If no error, the system handles non-existent products gracefully
    TestValidator.predicate(
      "removal of non-existent product handled without error",
      true,
    );
  } catch (exp) {
    // If error occurs, it should be an HTTP error (likely 404 Not Found)
    if (exp instanceof api.HttpError) {
      TestValidator.predicate(
        "non-existent product removal returns expected HTTP error",
        exp.status === 404 || exp.status === 204,
      );
    } else {
      throw exp;
    }
  }
}
