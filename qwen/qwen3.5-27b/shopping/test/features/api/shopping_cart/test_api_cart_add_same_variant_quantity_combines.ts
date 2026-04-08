import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that adding the same product variant to the cart again combines quantities instead of creating duplicate cart items.
 *
 * Validates the shopping cart quantity combination logic when the same product variant is added multiple times. The test ensures that quantities are summed rather than creating duplicate cart items, and that the subtotal is recalculated correctly while preserving the original price per unit.
 *
 * The test verifies that the cart item's ID remains the same after quantity combination, the created_at timestamp is preserved, and the updated_at timestamp reflects the modification. It also confirms that the price per unit remains consistent with the price at the time of the first add-to-cart action.
 *
 * 1. Customer registers and authenticates to the shopping mall platform.
 * 2. Seller registers and authenticates to create products.
 * 3. Seller creates a product with a base price and description.
 * 4. Seller creates a product variant with SKU code, options, and initial stock quantity.
 * 5. Customer adds the variant to cart with quantity 2 (creates initial cart item).
 * 6. Customer adds the SAME variant to cart again with quantity 3 (should combine to 5).
 * 7. Validates that the cart item ID remains unchanged (same item updated).
 * 8. Validates that the quantity is the sum of both additions (2 + 3 = 5).
 * 9. Validates that the subtotal is correctly recalculated (price × 5).
 * 10. Validates that created_at timestamp remains unchanged from first addition.
 * 11. Validates that updated_at timestamp is newer than created_at.
 * 12. Validates that deleted_at remains null (item is active).
 */
export async function test_api_cart_add_same_variant_quantity_combines(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with stock
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 100,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart with quantity 2 (first addition)
  const firstCartItem =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(firstCartItem);
  // Capture the first cart item's ID and created_at for validation
  const firstCartItemId = firstCartItem.id;
  const firstCreatedAt = firstCartItem.created_at;
  const firstQuantity = firstCartItem.quantity;
  const firstSubtotal = firstCartItem.subtotal;
  const pricePerUnit = firstSubtotal / firstQuantity;
  // 6. Customer adds the SAME variant to cart again with quantity 3 (should combine)
  const secondCartItem =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 3,
        } satisfies IShoppingMallCustomerCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // 7. Validate that the cart item ID remains unchanged (same item updated)
  TestValidator.equals(
    "cart item ID unchanged",
    secondCartItem.id,
    firstCartItemId,
  );
  // 8. Validate that the quantity is the sum of both additions (2 + 3 = 5)
  TestValidator.equals(
    "quantity combined correctly",
    secondCartItem.quantity,
    5,
  );
  // 9. Validate that the subtotal is correctly recalculated (price × 5)
  const expectedSubtotal = pricePerUnit * 5;
  TestValidator.equals(
    "subtotal recalculated correctly",
    secondCartItem.subtotal,
    expectedSubtotal,
  );
  // 10. Validate that created_at timestamp remains unchanged from first addition
  TestValidator.equals(
    "created_at unchanged",
    secondCartItem.created_at,
    firstCreatedAt,
  );
  // 11. Validate that updated_at timestamp is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(secondCartItem.updated_at) > new Date(secondCartItem.created_at),
  );
  // 12. Validate that deleted_at remains null (item is active)
  TestValidator.equals("deleted_at is null", secondCartItem.deleted_at, null);
  // Additional validation: price per unit remains consistent
  const secondPricePerUnit = secondCartItem.subtotal / secondCartItem.quantity;
  TestValidator.equals(
    "price per unit preserved",
    secondPricePerUnit,
    pricePerUnit,
  );
}
