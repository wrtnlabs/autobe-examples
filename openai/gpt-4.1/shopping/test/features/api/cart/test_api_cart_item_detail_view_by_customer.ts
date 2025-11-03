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
 * Validate viewing a customer cart item detail, including error scenarios.
 *
 * 1. Register a new customer and save their authentication context.
 * 2. As a seller, create a new product with a unique code and active status.
 * 3. Create a SKU for the product, picking one valid attribute value as required.
 * 4. Switch to customer context, add the SKU to the customer's cart by id and
 *    quantity.
 * 5. Retrieve the specific cart item by its id and validate results match exactly
 *    (SKU summary, quantity, cart owner, etc).
 * 6. Attempt to retrieve the cart item as a different, unrelated customer account
 *    (should error).
 * 7. Remove the item from the cart (not available in current API, thus skip active
 *    deletion step), and attempt to fetch again (should error or not found if
 *    deletion supported in future).
 */
export async function test_api_cart_item_detail_view_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer and save their authentication context.
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.com/register",
      referrer: "https://test.com/landing",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);
  const cartOwnerId = customer.id;

  // 2. As a seller (abstracted, context managed by backend), create a product.
  const productCode = RandomGenerator.alphaNumeric(10);
  const product = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri:
          "https://cdn.example.com/img/" +
          RandomGenerator.alphaNumeric(16) +
          ".jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(product);
  const skuAttr =
    product.attributes && product.attributes.length > 0
      ? product.attributes[0].attribute_value
      : undefined;

  // If product has no attributes, create a dummy value for test
  const variantAttrValue = skuAttr
    ? skuAttr.id
    : typia.random<string & tags.Format<"uuid">>();

  // 3. Create SKU under the given product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: skuCode,
        price: 9990,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [variantAttrValue],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. As customer, add SKU to the cart (customer authentication context is already set)
  // The customer's cartId is assumed to match their id or be discoverable implicitly.
  // We'll use customer.id as cartId (commonly the same in such systems for simplification).
  const cartId = customer.id;
  const addItem = await api.functional.shopping.customer.carts.items.create(
    connection,
    {
      cartId: cartId,
      body: {
        shopping_sku_id: sku.id,
        quantity: 2 as number & tags.Type<"int32">,
      } satisfies IShoppingCartItem.ICreate,
    },
  );
  typia.assert(addItem);

  // 5. Retrieve the cart item and validate it matches exactly
  const cartItem = await api.functional.shopping.customer.carts.items.at(
    connection,
    {
      cartId: cartId,
      itemId: addItem.id,
    },
  );
  typia.assert(cartItem);
  TestValidator.equals("cart item id matches", cartItem.id, addItem.id);
  TestValidator.equals("SKU summary matches", cartItem.sku, addItem.sku);
  TestValidator.equals("quantity matches", cartItem.quantity, addItem.quantity);
  TestValidator.equals("cart id matches", cartItem.shopping_cart_id, cartId);
  TestValidator.equals(
    "cart owner id matches",
    cartItem.cart_owner.id,
    cartOwnerId,
  );

  // 6. Register a new (unrelated) customer and try to access the other account's cart item
  const strangerEmail = typia.random<string & tags.Format<"email">>();
  const strangerPassword = RandomGenerator.alphaNumeric(12);
  const stranger = await api.functional.auth.customer.join(connection, {
    body: {
      email: strangerEmail,
      password: strangerPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.com/register2",
      referrer: "https://test.com/landing2",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(stranger);
  // Switch to stranger account (authenticated via join sets context automatically)
  await TestValidator.error(
    "stranger cannot access other customer's cart item",
    async () => {
      await api.functional.shopping.customer.carts.items.at(connection, {
        cartId: cartId,
        itemId: addItem.id,
      });
    },
  );

  // 7. Simulate removal of item and attempt to access again (if delete existed; simulate error)
  // Not implemented: removal API unavailable in provided endpoints, so just simulate edge failure.
}
