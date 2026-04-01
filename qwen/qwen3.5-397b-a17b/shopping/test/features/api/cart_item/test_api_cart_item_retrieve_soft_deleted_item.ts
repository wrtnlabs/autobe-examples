import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_cart_item_retrieve_soft_deleted_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Verify product has at least one variant
  TestValidator.predicate("product has variants", product.variants.length > 0);
  const variant = product.variants[0]!;
  // 4. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // Store the cart item ID for later retrieval
  const cartItemId = cartItem.id;
  // Verify the cart item is active (not deleted)
  TestValidator.predicate("cart item is active", cartItem.deleted_at === null);
  TestValidator.equals(
    "variant matches",
    cartItem.productVariant.id,
    variant.id,
  );
  // 5. Soft delete the cart item by removing it from cart
  await api.functional.shoppingMall.customer.cart.items.erase(
    customerConnection,
    {
      itemId: cartItemId,
    },
  );
  // 6. Retrieve the soft-deleted cart item by ID
  const retrievedItem =
    await api.functional.shoppingMall.customer.cart.items.at(
      customerConnection,
      {
        itemId: cartItemId,
      },
    );
  typia.assert(retrievedItem);
  // 7. Verify the retrieved item has deleted_at populated
  TestValidator.predicate(
    "deleted_at is populated after soft delete",
    retrievedItem.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is valid timestamp",
    typeof retrievedItem.deleted_at === "string" &&
      retrievedItem.deleted_at.length > 0,
  );
  // 8. Verify all other fields remain intact
  TestValidator.equals("id matches", retrievedItem.id, cartItemId);
  TestValidator.equals(
    "quantity preserved",
    retrievedItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals("price preserved", retrievedItem.price, cartItem.price);
  TestValidator.equals(
    "cart reference preserved",
    retrievedItem.cart.id,
    cartItem.cart.id,
  );
  TestValidator.equals(
    "product variant preserved",
    retrievedItem.productVariant.id,
    cartItem.productVariant.id,
  );
  // 9. Verify timestamps are preserved
  TestValidator.equals(
    "created_at preserved",
    retrievedItem.created_at,
    cartItem.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    typeof retrievedItem.updated_at === "string" &&
      retrievedItem.updated_at.length > 0,
  );
  // 10. Verify deleted_at is after updated_at (soft delete happened last)
  const deletedAt = new Date(retrievedItem.deleted_at!).getTime();
  const updatedAt = new Date(retrievedItem.updated_at).getTime();
  TestValidator.predicate(
    "deleted_at is after or equal to updated_at",
    deletedAt >= updatedAt,
  );
}