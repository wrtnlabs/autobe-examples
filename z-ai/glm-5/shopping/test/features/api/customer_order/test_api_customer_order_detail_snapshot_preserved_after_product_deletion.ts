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
 * Test that order details remain fully accessible with complete snapshot data
 * even after the original product or variant has been deleted by the seller.
 *
 * This validates the snapshot principle which ensures historical accuracy for
 * legal compliance and dispute resolution. The test verifies:
 * 1. Order can still be retrieved after product deletion
 * 2. Product reference in order item is null (deleted)
 * 3. Variant reference in order item is null (deleted)
 * 4. All snapshot data is preserved: product_name, product_description,
 *    product_category_name, product_base_price, product_thumbnail_url,
 *    variant_sku_code, variant_price, seller_shop_name, seller_shop_description,
 *    seller_logo_url
 * 5. Variant options remain accessible
 * 6. Seller information is preserved (seller account is not deleted)
 */
export async function test_api_customer_order_detail_snapshot_preserved_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Phase 1: Setup Admin for Seller Approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Phase 2: Setup and Approve Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(sellerAuth);
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
  // Phase 3: Create Product with Variant and Stock
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "M" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // Phase 4: Create Customer and Place Order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Customer adds the specific variant to cart
  const cartItem = await api.functional.shoppingMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: 2,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Phase 5: Capture Pre-Deletion Order Details
  const orderBeforeDeletion =
    await api.functional.shoppingMall.customer.customers.me.orders.at(
      customerConnection,
      { orderId: order.id },
    );
  typia.assert(orderBeforeDeletion);
  const orderItemBefore = orderBeforeDeletion.orderItems[0];
  typia.assert(orderItemBefore);
  // Store snapshot values for verification
  const snapshotData = {
    productName: orderItemBefore.productName,
    productDescription: orderItemBefore.productDescription,
    productCategoryName: orderItemBefore.productCategoryName,
    productBasePrice: orderItemBefore.productBasePrice,
    productThumbnailUrl: orderItemBefore.productThumbnailUrl,
    variantSkuCode: orderItemBefore.variantSkuCode,
    variantPrice: orderItemBefore.variantPrice,
    sellerShopName: orderItemBefore.sellerShopName,
    sellerShopDescription: orderItemBefore.sellerShopDescription,
    sellerLogoUrl: orderItemBefore.sellerLogoUrl,
    quantity: orderItemBefore.quantity,
    unitPrice: orderItemBefore.unitPrice,
  };
  // Phase 6: Seller Deletes Product
  await api.functional.shoppingMall.seller.sellers.me.products.erase(
    sellerConnection,
    { productId: product.id },
  );
  // Phase 7: Verify Order Details and Snapshot Preservation After Deletion
  const orderAfterDeletion =
    await api.functional.shoppingMall.customer.customers.me.orders.at(
      customerConnection,
      { orderId: order.id },
    );
  typia.assert(orderAfterDeletion);
  const orderItemAfter = orderAfterDeletion.orderItems[0];
  typia.assert(orderItemAfter);
  // Verify product and variant references are null (deleted)
  TestValidator.equals(
    "product reference null after deletion",
    orderItemAfter.product,
    null,
  );
  TestValidator.equals(
    "variant reference null after deletion",
    orderItemAfter.variant,
    null,
  );
  // Verify all snapshot data is preserved
  TestValidator.equals(
    "product name preserved",
    orderItemAfter.productName,
    snapshotData.productName,
  );
  TestValidator.equals(
    "product description preserved",
    orderItemAfter.productDescription,
    snapshotData.productDescription,
  );
  TestValidator.equals(
    "product category name preserved",
    orderItemAfter.productCategoryName,
    snapshotData.productCategoryName,
  );
  TestValidator.equals(
    "product base price preserved",
    orderItemAfter.productBasePrice,
    snapshotData.productBasePrice,
  );
  TestValidator.equals(
    "product thumbnail url preserved",
    orderItemAfter.productThumbnailUrl,
    snapshotData.productThumbnailUrl,
  );
  TestValidator.equals(
    "variant sku code preserved",
    orderItemAfter.variantSkuCode,
    snapshotData.variantSkuCode,
  );
  TestValidator.equals(
    "variant price preserved",
    orderItemAfter.variantPrice,
    snapshotData.variantPrice,
  );
  TestValidator.equals(
    "seller shop name preserved",
    orderItemAfter.sellerShopName,
    snapshotData.sellerShopName,
  );
  TestValidator.equals(
    "seller shop description preserved",
    orderItemAfter.sellerShopDescription,
    snapshotData.sellerShopDescription,
  );
  TestValidator.equals(
    "seller logo url preserved",
    orderItemAfter.sellerLogoUrl,
    snapshotData.sellerLogoUrl,
  );
  TestValidator.equals(
    "quantity preserved",
    orderItemAfter.quantity,
    snapshotData.quantity,
  );
  TestValidator.equals(
    "unit price preserved",
    orderItemAfter.unitPrice,
    snapshotData.unitPrice,
  );
  // Verify variant options are preserved
  TestValidator.predicate(
    "variant options preserved",
    orderItemAfter.variantOptions.length > 0,
  );
}
