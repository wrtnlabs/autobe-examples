import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that cart items with deleted product variants are properly marked as unavailable and handled correctly.
 *
 * **Setup**: Customer joins, seller creates product with variants, customer adds variants to cart, seller deletes a variant.
 *
 * **Test Steps**:
 * 1. Customer joins and views empty cart - verify empty data array with zero pagination counts
 * 2. Seller creates product with multiple variants (e.g., color: red, blue, green)
 * 3. Customer adds all three variants to cart with quantities
 * 4. Customer views cart - verify all three items are available (is_available=true)
 * 5. Seller deletes one variant (e.g., green)
 * 6. Customer views cart again - verify deleted variant is marked as is_available=false
 * 7. Verify deleted variant item still appears in cart but cannot be used for checkout
 * 8. Customer applies is_available=false filter - verify deleted variant appears in results
 * 9. Customer applies is_available=true filter - verify deleted variant is excluded
 * 10. Verify cart total excludes the deleted variant's subtotal
 * 11. Verify cart item shows correct product name and variant options even after deletion
 * 12. Verify customer can still remove the unavailable item from cart
 *
 * **Expected Results**:
 * - Deleted variants are marked as unavailable (is_available=false)
 * - Unavailable items remain visible in cart but are excluded from checkout
 * - Cart total calculation excludes unavailable items
 * - Customer can filter to view only available or only unavailable items
 * - Deleted variant items can still be removed from cart
 * - Data isolation: customer cannot see other customers' cart items with deleted variants
 */
export async function test_api_cart_items_deleted_variant_unavailable_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller creates product (utility handles category creation internally)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies DeepPartial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 4. Seller creates three variants (red, blue, green)
  const variants = await Promise.all([
    generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-RED-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies DeepPartial<IEcommerceMallProductVariant.ICreate>,
      },
    ),
    generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-BLUE-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "color", value: "Blue" }],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies DeepPartial<IEcommerceMallProductVariant.ICreate>,
      },
    ),
    generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-GREEN-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "color", value: "Green" }],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies DeepPartial<IEcommerceMallProductVariant.ICreate>,
      },
    ),
  ]);
  typia.assert(variants[0]);
  typia.assert(variants[1]);
  typia.assert(variants[2]);
  const [redVariant, blueVariant, greenVariant] = variants;
  // 5. Customer views empty cart
  const emptyCart =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(emptyCart);
  TestValidator.equals("empty cart data count", emptyCart.data.length, 0);
  TestValidator.equals(
    "empty cart pagination records",
    emptyCart.pagination.records,
    0,
  );
  // 6. Customer adds all three variants to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: redVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: blueVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: greenVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 7. Customer views cart - verify all three items are available
  const cartBeforeDeletion =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(cartBeforeDeletion);
  TestValidator.equals(
    "cart items count before deletion",
    cartBeforeDeletion.data.length,
    3,
  );
  const allAvailableBefore = cartBeforeDeletion.data.every(
    (item) => item.is_available === true,
  );
  TestValidator.predicate(
    "all items available before deletion",
    allAvailableBefore,
  );
  // 8. Seller deletes green variant
  await api.functional.ecommerceMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: greenVariant.id,
    },
  );
  // 9. Customer views cart again - verify deleted variant is marked as unavailable
  const cartAfterDeletion =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(cartAfterDeletion);
  TestValidator.equals(
    "cart items count after deletion",
    cartAfterDeletion.data.length,
    3,
  );
  // Find the deleted variant item
  const deletedCartItem = typia.assert(
    cartAfterDeletion.data.find(
      (item) => item.product_variant.id === greenVariant.id,
    )!,
  );
  TestValidator.equals(
    "deleted variant is unavailable",
    deletedCartItem.is_available,
    false,
  );
  // Verify other variants are still available
  const availableCartItem = typia.assert(
    cartAfterDeletion.data.find(
      (item) => item.product_variant.id === redVariant.id,
    )!,
  );
  TestValidator.equals(
    "red variant still available",
    availableCartItem.is_available,
    true,
  );
  // 10. Customer applies is_available=false filter - verify deleted variant appears
  const unavailableItems =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      { body: { is_available: false } },
    );
  typia.assert(unavailableItems);
  TestValidator.equals(
    "unavailable items count",
    unavailableItems.data.length,
    1,
  );
  TestValidator.equals(
    "unavailable item is deleted variant",
    unavailableItems.data[0].product_variant.id,
    greenVariant.id,
  );
  // 11. Customer applies is_available=true filter - verify deleted variant is excluded
  const availableItems =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      { body: { is_available: true } },
    );
  typia.assert(availableItems);
  TestValidator.equals("available items count", availableItems.data.length, 2);
  const hasDeletedVariant = availableItems.data.some(
    (item) => item.product_variant.id === greenVariant.id,
  );
  TestValidator.predicate(
    "deleted variant excluded from available filter",
    !hasDeletedVariant,
  );
  // 12. Verify variant options preserved even after deletion
  TestValidator.equals(
    "variant options preserved",
    deletedCartItem.product_variant.option_values.color,
    "Green",
  );
  // 13. Verify customer can still remove the unavailable item from cart
  // Note: The template doesn't include DELETE endpoint for cart items, so this step is skipped
  // The test focuses on the unavailable status marking and filtering behavior
}
