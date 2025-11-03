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
 * E2E test: Authenticated customer adds SKU items to their cart and
 * business/edge rules are enforced.
 */
export async function test_api_cart_item_addition_by_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Register first customer (cart owner)
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer1Email,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://customer-join.test/owner",
        referrer: "https://referrer-for-owner.test/",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer1);
  // Assume cartId is same as customer UUID (as no cart create/lookup API), or use
  // customer1.id as cartId (since cart context was not shown in API, but SKU addition requires cartId).
  const cartId = customer1.id;

  // 2. Register a seller and create a product
  // As we don't have seller APIs here, simulate seller-owned product via direct creation.
  // productCode must be unique
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://product.image/test.png",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create an active, in-stock SKU for the product (requires at least 1 variant_attribute_value_ids - use random value)
  // Compose dummy attribute value UUID for variant_attribute_value_ids.
  const variantAttributeValueId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(12);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 1500,
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: [variantAttributeValueId],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Add the SKU to the owner’s cart (valid operation)
  const quantity1 = 2;
  const item1: IShoppingCartItem =
    await api.functional.shopping.customer.carts.items.create(connection, {
      cartId,
      body: {
        shopping_sku_id: sku.id,
        quantity: quantity1,
      } satisfies IShoppingCartItem.ICreate,
    });
  typia.assert(item1);
  TestValidator.equals("cart owner matches", item1.cart_owner.id, customer1.id);
  TestValidator.equals("sku id matches", item1.sku.id, sku.id);
  TestValidator.equals("quantity is set", item1.quantity, quantity1);

  // 5. Add the same SKU again to increase quantity (should increment, not duplicate)
  const quantity2 = 3;
  const item2: IShoppingCartItem =
    await api.functional.shopping.customer.carts.items.create(connection, {
      cartId,
      body: {
        shopping_sku_id: sku.id,
        quantity: quantity2,
      } satisfies IShoppingCartItem.ICreate,
    });
  typia.assert(item2);
  TestValidator.equals(
    "cart owner matches after increment",
    item2.cart_owner.id,
    customer1.id,
  );
  TestValidator.equals("sku id matches after increment", item2.sku.id, sku.id);
  TestValidator.equals(
    "quantity incremented",
    item2.quantity,
    quantity1 + quantity2,
  );

  // 6. Error: Add invalid SKU ID (should fail)
  await TestValidator.error("adding invalid SKU id should fail", async () => {
    await api.functional.shopping.customer.carts.items.create(connection, {
      cartId,
      body: {
        shopping_sku_id: typia.random<string & tags.Format<"uuid">>(), // random UUID, not linked to any SKU
        quantity: 1,
      } satisfies IShoppingCartItem.ICreate,
    });
  });

  // 7. Error: Add with excessive quantity
  await TestValidator.error(
    "adding excessive quantity should fail",
    async () => {
      await api.functional.shopping.customer.carts.items.create(connection, {
        cartId,
        body: {
          shopping_sku_id: sku.id,
          quantity: 99999, // Exceeds plausible inventory/business rule
        } satisfies IShoppingCartItem.ICreate,
      });
    },
  );

  // 8. Error: Add inactive/discontinued SKU
  // First, make an inactive SKU
  const inactiveSku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: 2000,
        is_active: false,
        barcode: null,
        status: "discontinued",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(inactiveSku);
  await TestValidator.error("adding inactive sku should fail", async () => {
    await api.functional.shopping.customer.carts.items.create(connection, {
      cartId,
      body: {
        shopping_sku_id: inactiveSku.id,
        quantity: 1,
      } satisfies IShoppingCartItem.ICreate,
    });
  });

  // 9. Error: Another customer cannot add to this cart
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer2Email,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://customer-join.test/nonowner",
        referrer: "https://referrer-for-nonowner.test/",
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer2);
  // customer2 attempts to add to customer1's cart (should fail)
  await TestValidator.error(
    "adding to another user’s cart is forbidden",
    async () => {
      await api.functional.shopping.customer.carts.items.create(connection, {
        cartId, // still the first customer’s cart
        body: {
          shopping_sku_id: sku.id,
          quantity: 1,
        } satisfies IShoppingCartItem.ICreate,
      });
    },
  );
}
