import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that an administrator can retrieve order item details with complete historical snapshot integrity.
 * Verifies that product and variant states are preserved exactly as they were at order time
 * even if the original product/variant has been modified after purchase.
 */
export async function test_api_admin_order_item_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: "Admin123!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Seller setup - create and login
  const sellerJoinEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerJoinEmail,
      password: "Seller123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoinEmail,
      password: "Seller123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(
      adminLoginConnection,
      {
        sellerId: sellerJoin.id,
      },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Admin creates category for product
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Seller creates product with INITIAL values
  const initialProductName = RandomGenerator.name();
  const initialProductDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialBasePrice = 10000;
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: initialProductName,
        description: initialProductDescription,
        shopping_category_id: category.id,
        base_price: initialBasePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates variant with INITIAL values
  const initialSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const initialVariantPrice = 15000;
  const initialOptionKey = "color";
  const initialOptionValue = "Red";
  const initialStockQuantity = 50;
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: initialSkuCode,
          price: initialVariantPrice,
          stock_quantity: initialStockQuantity,
          options: [
            {
              key: initialOptionKey,
              value: initialOptionValue,
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. Customer setup - create and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "Customer123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: "Customer123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 8. Customer adds variant to cart
  const orderQuantity = 2;
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: orderQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 9. Customer creates address for order (using random UUID as test address ID)
  // Note: In real scenario, address would be created via address management endpoint
  const addressId = typia.random<string & tags.Format<"uuid">>();
  // 10. Customer places order
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerLoginConnection,
    {
      body: {
        addressId: addressId,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  const orderId = order.id;
  const itemId = orderItem.id;
  // Capture ORIGINAL snapshot values at order time
  const originalProductName = orderItem.productSnapshot.name;
  const originalProductBasePrice = orderItem.productSnapshot.base_price;
  const originalVariantSkuCode = orderItem.productVariantSnapshot.sku_code;
  const originalVariantPrice = orderItem.productVariantSnapshot.price;
  const originalVariantOptions = orderItem.productVariantSnapshot.option_values;
  // Verify order item status is PAID
  TestValidator.equals("order item status", orderItem.status, "PAID");
  // 11. Seller modifies the product (change name, description, base price)
  const updatedProductName = `UPDATED-${RandomGenerator.name()}`;
  const updatedProductDescription = `UPDATED-${RandomGenerator.paragraph({ sentences: 2 })}`;
  const updatedBasePrice = 20000;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          name: updatedProductName,
          description: updatedProductDescription,
          basePrice: updatedBasePrice,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 12. Seller modifies the variant (change SKU, options, price)
  const updatedSkuCode = `UPDATED-SKU-${RandomGenerator.alphaNumeric(8)}`;
  const updatedVariantPrice = 25000;
  const updatedOptionKey = "size";
  const updatedOptionValue = "Large";
  const updatedVariant =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerLoginConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: updatedSkuCode,
          price: updatedVariantPrice,
          optionValues: {
            [updatedOptionKey]: updatedOptionValue,
          },
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 13. Admin retrieves the order item
  const adminOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(
      adminLoginConnection,
      {
        orderId: orderId,
        itemId: itemId,
      },
    );
  typia.assert(adminOrderItem);
  // 14. Verify snapshot contains ORIGINAL values (before modification)
  TestValidator.equals(
    "product snapshot name preserved",
    adminOrderItem.productSnapshot.name,
    originalProductName,
  );
  TestValidator.equals(
    "product snapshot base_price preserved",
    adminOrderItem.productSnapshot.base_price,
    originalProductBasePrice,
  );
  TestValidator.equals(
    "variant snapshot sku_code preserved",
    adminOrderItem.productVariantSnapshot.sku_code,
    originalVariantSkuCode,
  );
  TestValidator.equals(
    "variant snapshot price preserved",
    adminOrderItem.productVariantSnapshot.price,
    originalVariantPrice,
  );
  TestValidator.equals(
    "variant snapshot options preserved",
    adminOrderItem.productVariantSnapshot.option_values,
    originalVariantOptions,
  );
  // 15. Verify current productVariant shows UPDATED values (after modification)
  TestValidator.equals(
    "current variant skuCode updated",
    adminOrderItem.productVariant.skuCode,
    updatedSkuCode,
  );
  TestValidator.predicate(
    "current variant reflects price change",
    adminOrderItem.productVariant.price === updatedVariantPrice,
  );
  // 16. Verify seller information is current (not historical)
  TestValidator.equals(
    "seller shop_name is current",
    adminOrderItem.seller.shop_name,
    sellerJoin.shop_name,
  );
  // 17. Verify snapshot immutability - snapshots should not equal current values
  TestValidator.notEquals(
    "snapshot name differs from current",
    adminOrderItem.productSnapshot.name,
    updatedProduct.name,
  );
  TestValidator.notEquals(
    "snapshot base_price differs from current",
    adminOrderItem.productSnapshot.base_price,
    updatedProduct.base_price,
  );
  TestValidator.notEquals(
    "snapshot sku_code differs from current",
    adminOrderItem.productVariantSnapshot.sku_code,
    updatedVariant.skuCode,
  );
}
