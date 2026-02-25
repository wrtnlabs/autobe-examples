import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test order creation snapshot preservation.
 *
 * This test validates that order items preserve complete snapshot data at the time
 * of purchase, ensuring historical accuracy even if products, variants, or seller
 * profiles are later modified or deleted.
 *
 * Test Flow:
 * 1. Admin registers to approve seller
 * 2. Seller registers and gets approved
 * 3. Seller creates product with category, description, base price
 * 4. Seller creates variant with SKU code, options, and price override
 * 5. Seller adds inventory
 * 6. Customer registers and authenticates
 * 7. Customer adds variant to cart
 * 8. Customer places order
 * 9. Verify all snapshot fields are captured correctly
 */
export async function test_api_order_creation_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // STEP 1: Setup Admin (to approve seller)
  // ========================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // ========================================
  // STEP 2: Setup Seller
  // ========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerShopName = RandomGenerator.name() + " Store";
  const sellerShopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const sellerLogoUrl = typia.random<string & tags.Format<"url">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
      shop_description: sellerShopDescription,
      logo_url: sellerLogoUrl,
    },
  });
  typia.assert(sellerAuth);
  // Seller should have pending status initially
  TestValidator.equals(
    "seller initial status",
    sellerAuth.approvalStatus,
    "pending",
  );
  // ========================================
  // STEP 3: Admin approves seller
  // ========================================
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // Re-login seller to get updated status
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.com/login",
      referrer: "https://test.com",
    },
  });
  // ========================================
  // STEP 4: Seller creates product
  // ========================================
  const productName = "Premium Product " + RandomGenerator.alphaNumeric(6);
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const productBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: productBasePrice,
      },
    },
  );
  typia.assert(product);
  // Store original product data for snapshot verification
  const originalProductName = product.name;
  const originalProductDescription = product.description;
  const originalProductBasePrice = product.base_price;
  const originalCategoryName = product.category?.name ?? "";
  // ========================================
  // STEP 5: Seller creates variant
  // ========================================
  const variantSkuCode = "SKU-" + RandomGenerator.alphaNumeric(8).toUpperCase();
  const variantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: variantSkuCode,
          price: variantPrice,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // Store original variant data for snapshot verification
  const originalVariantSkuCode = variant.skuCode;
  const originalVariantPrice = variant.price;
  // ========================================
  // STEP 6: Seller adds inventory
  // ========================================
  const inventoryResult =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerLoginConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 50,
          reason: "Initial restock for testing",
        },
      },
    );
  typia.assert(inventoryResult);
  // ========================================
  // STEP 7: Customer setup
  // ========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // ========================================
  // STEP 8: Customer adds variant to cart
  // ========================================
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // ========================================
  // STEP 9: Customer places order
  // Note: We need an address_id for the order
  // Since there's no address creation endpoint in the provided APIs,
  // we use the generate function which handles the creation
  // ========================================
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        address_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // ========================================
  // STEP 10: Verify snapshot data preservation
  // ========================================
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // Verify product snapshot fields
  TestValidator.equals(
    "product name snapshot",
    orderItem.productName,
    originalProductName,
  );
  TestValidator.equals(
    "product description snapshot",
    orderItem.productDescription,
    originalProductDescription,
  );
  TestValidator.equals(
    "product base price snapshot",
    orderItem.productBasePrice,
    originalProductBasePrice,
  );
  TestValidator.equals(
    "product category name snapshot",
    orderItem.productCategoryName,
    originalCategoryName,
  );
  // Verify variant snapshot fields
  TestValidator.equals(
    "variant SKU code snapshot",
    orderItem.variantSkuCode,
    originalVariantSkuCode,
  );
  TestValidator.equals(
    "variant price snapshot",
    orderItem.variantPrice,
    originalVariantPrice ?? productBasePrice,
  );
  // Verify variant options are preserved
  TestValidator.predicate(
    "variant options exist",
    orderItem.variantOptions.length > 0,
  );
  const colorOption = orderItem.variantOptions.find(
    (opt) => opt.key === "color",
  );
  const sizeOption = orderItem.variantOptions.find((opt) => opt.key === "size");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.equals("color option value", colorOption?.value, "Red");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("size option value", sizeOption?.value, "Large");
  // Verify seller snapshot fields
  TestValidator.equals(
    "seller shop name snapshot",
    orderItem.sellerShopName,
    sellerShopName,
  );
  TestValidator.equals(
    "seller shop description snapshot",
    orderItem.sellerShopDescription,
    sellerShopDescription,
  );
  TestValidator.equals(
    "seller logo url snapshot",
    orderItem.sellerLogoUrl,
    sellerLogoUrl,
  );
  // Verify order item has correct quantity and price
  TestValidator.equals("order item quantity", orderItem.quantity, 2);
  TestValidator.equals(
    "order item unit price",
    orderItem.unitPrice,
    variantPrice ?? productBasePrice,
  );
  // Verify order status
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // Verify shipping address snapshot exists
  TestValidator.predicate("shipping address exists", order.address !== null);
  TestValidator.predicate(
    "recipient name exists",
    order.address.recipientName.length > 0,
  );
  TestValidator.predicate("phone exists", order.address.phone.length > 0);
  TestValidator.predicate("street exists", order.address.street.length > 0);
  TestValidator.predicate("city exists", order.address.city.length > 0);
}
