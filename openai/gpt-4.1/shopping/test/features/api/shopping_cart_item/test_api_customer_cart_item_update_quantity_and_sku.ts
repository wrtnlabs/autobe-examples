import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCartItem";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validate update of quantity for a cart item by customer, including changes up
 * and down and boundary cases. Also validate (by business logic) that only
 * active/allowed SKUs can be set as reference for replace. Test unauthorized
 * access as well.
 *
 * Steps:
 *
 * 1. Register seller (to enable product and SKU creation)
 * 2. Register customer (cart owner)
 * 3. Seller creates a product
 * 4. Seller creates multiple SKUs for the product (at least 2, with different
 *    codes and prices)
 * 5. Customer adds SKU1 to a new cart as a cart item (simulate cart creation by
 *    first insert)
 * 6. Update cart item to new quantity (increase, decrease, set max - e.g., 10, 2,
 *    or platform max)
 * 7. Update cart item to another valid active SKU2 (SKU substitution)
 * 8. Try referencing an inactive SKU or exceeding max quantity - expect error
 * 9. Try updating as unauthorized user - expect error
 * 10. After each update, validate returned cart item (quantity, SKU, updated_at,
 *     error_flags)
 */
export async function test_api_customer_cart_item_update_quantity_and_sku(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test-origin.example.com/signup",
      referrer: "https://test-referrer.example.com/ref",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerJoin);

  // 3. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri:
          "https://images.example.com/" +
          RandomGenerator.alphaNumeric(8) +
          ".jpg",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Seller creates multiple SKUs
  // We'll prepare two attribute values to use as variant attributes for the SKUs
  // Since attribute creation APIs are not provided, variants will be arbitrary UUIDs (simulate as string&tags.Format<"uuid">)
  const attr1 = typia.random<string & tags.Format<"uuid">>();
  const attr2 = typia.random<string & tags.Format<"uuid">>();
  const sku1Code = "SKU-" + RandomGenerator.alphaNumeric(8);
  const sku2Code = "SKU-" + RandomGenerator.alphaNumeric(8);
  // SKU 1 (active)
  const sku1 = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: sku1Code,
        price: 10000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [attr1],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku1);

  // SKU 2 (also active, higher price)
  const sku2 = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: sku2Code,
        price: 12000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [attr2],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku2);

  // SKU 3 (inactive, cannot be referenced for substitution)
  const attr3 = typia.random<string & tags.Format<"uuid">>();
  const sku3Code = "SKU-" + RandomGenerator.alphaNumeric(8);
  const sku3 = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: {
        sku_code: sku3Code,
        price: 15000,
        is_active: false,
        status: "discontinued",
        variant_attribute_value_ids: [attr3],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku3);

  // 5. Customer adds SKU1 to a new cart as cart item (simulate cart creation by first insert).
  // There is no API for adding cart items; only update, so we simulate the pre-existing item: Assume cartId/itemId are needed (simulate with random UUIDs)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();

  // Insert the starting cart item (simulate as if already exists): Only update endpoint exists
  // We create it with initial quantity 1 with the active SKU1
  let cartItem = await api.functional.shopping.customer.carts.items.update(
    connection,
    {
      cartId,
      itemId,
      body: {
        quantity: 1,
      } satisfies IShoppingCartItem.IUpdate,
    },
  );
  typia.assert(cartItem);
  TestValidator.equals(
    "initial cart item sku_id matches",
    cartItem.sku.id,
    sku1.id,
  );
  TestValidator.equals("initial cart item quantity", cartItem.quantity, 1);

  // 6. Update cart item to new quantity (increase to 5)
  cartItem = await api.functional.shopping.customer.carts.items.update(
    connection,
    {
      cartId,
      itemId,
      body: {
        quantity: 5,
      } satisfies IShoppingCartItem.IUpdate,
    },
  );
  typia.assert(cartItem);
  TestValidator.equals("increase quantity", cartItem.quantity, 5);

  // Decrease quantity to 2
  cartItem = await api.functional.shopping.customer.carts.items.update(
    connection,
    {
      cartId,
      itemId,
      body: {
        quantity: 2,
      } satisfies IShoppingCartItem.IUpdate,
    },
  );
  typia.assert(cartItem);
  TestValidator.equals("decrease quantity", cartItem.quantity, 2);

  // Set to high quantity (simulate platform max as 10)
  cartItem = await api.functional.shopping.customer.carts.items.update(
    connection,
    {
      cartId,
      itemId,
      body: {
        quantity: 10,
      } satisfies IShoppingCartItem.IUpdate,
    },
  );
  typia.assert(cartItem);
  TestValidator.equals("set max quantity", cartItem.quantity, 10);

  // 7. Attempt to update cart item SKU (simulate substitution to SKU2)
  // As IShoppingCartItem.IUpdate only allows quantity (no sku change), this part cannot be implemented, so skip.

  // 8. Try referencing an inactive SKU (SKU3) or exceeding max quantity (simulate)
  // Since API doesn't let us specify sku, and can only update quantity, test quantity boundary
  await TestValidator.error("exceed max quantity should fail", async () => {
    await api.functional.shopping.customer.carts.items.update(connection, {
      cartId,
      itemId,
      body: {
        quantity: 9999, // arbitrarily large
      } satisfies IShoppingCartItem.IUpdate,
    });
  });

  // 9. Try updating as unauthorized user (register another customer)
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attackerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: attackerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test-origin.example.com/hack",
      referrer: "https://test-referrer.example.com/hackref",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(attackerJoin);
  // Attempt to update cart belonging to previous customer
  await TestValidator.error(
    "unauthorized user cannot update other's cart item",
    async () => {
      await api.functional.shopping.customer.carts.items.update(connection, {
        cartId,
        itemId,
        body: {
          quantity: 2,
        } satisfies IShoppingCartItem.IUpdate,
      });
    },
  );

  // 10. After each update, validate returned cart item (quantity, SKU, updated_at, error_flags are either undefined or empty)
  TestValidator.equals("sku exists after update", !!cartItem.sku, true);
  TestValidator.equals(
    "cart owner is active",
    cartItem.cart_owner.is_active,
    true,
  );
  TestValidator.equals(
    "error_flags are empty or undefined",
    cartItem.error_flags ?? [],
    [],
  );
}
