import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test customer retrieval of a single order item after placing an order.
 *
 * Validates that a customer can retrieve the full detail of an order item they own,
 * including the variant reference with SKU code and option values, the frozen quantity
 * and unit price at checkout, the current lifecycle status ("paid"), and the parent
 * order summary matching the order code. Ensures all three purchase-time snapshots are
 * present — the product snapshot (frozen name, description, base_price, and category
 * name), the variant snapshot (frozen SKU code, option values, and unit price), and
 * the seller snapshot (frozen shop name and logo). Also verifies that the shipment
 * field is null for an unshipped item and that cancellation and refund request arrays
 * are empty for a newly created order.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins and creates a product under the category.
 * 3. Seller creates a variant with SKU code and option values.
 * 4. Seller adds stock to the variant via an inventory record.
 * 5. Customer joins and places an order with the variant.
 * 6. Customer retrieves the order item detail by order code and item ID.
 * 7. Validates all fields of the order item response.
 */
export async function test_api_order_item_view_by_owning_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — join and create a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 2. Seller setup — join and create a product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 3. Create a variant with SKU code and option values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Add stock to the variant
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
    },
  );
  // 5. Customer setup — join and place an order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  // 6. Retrieve the order item detail
  const detail = await api.functional.shoppingMall.customer.orders.items.at(
    customerConnection,
    {
      orderCode: order.code,
      itemId: orderItem.id,
    },
  );
  typia.assert(detail);
  // 7. Validate core fields
  TestValidator.equals("id", detail.id, orderItem.id);
  TestValidator.equals("quantity", detail.quantity, orderItem.quantity);
  TestValidator.equals("price", detail.price, orderItem.price);
  TestValidator.equals("status", detail.status, "paid");
  // Parent order summary
  TestValidator.equals("order code", detail.order.code, order.code);
  TestValidator.equals("order id", detail.order.id, order.id);
  // Variant reference
  TestValidator.equals("variant code", detail.variant.code, variant.code);
  for (const opt of variant.optionValues) {
    TestValidator.predicate(
      `variant optionValues contains key "${opt.key}"`,
      detail.variant.optionValues.some((v) => v.key === opt.key),
    );
  }
  // Shipment must be null for an unshipped item
  TestValidator.equals("shipment null", detail.shipment, null);
  // Cancellation and refund request arrays must be empty
  TestValidator.equals(
    "cancellationRequests empty",
    detail.cancellationRequests.length,
    0,
  );
  TestValidator.equals("refundRequests empty", detail.refundRequests.length, 0);
  // Product snapshot — frozen name, description, base_price, category name
  TestValidator.predicate(
    "productSnapshot exists",
    detail.productSnapshot !== null,
  );
  if (detail.productSnapshot) {
    TestValidator.equals(
      "product snapshot name",
      detail.productSnapshot.name,
      product.name,
    );
    TestValidator.equals(
      "product snapshot description",
      detail.productSnapshot.description,
      product.description,
    );
    TestValidator.equals(
      "product snapshot base_price",
      detail.productSnapshot.base_price,
      product.base_price,
    );
    TestValidator.equals(
      "product snapshot category_name",
      detail.productSnapshot.category_name,
      category.name,
    );
  }
  // Variant snapshot — frozen SKU code, option values, unit price
  TestValidator.predicate(
    "variantSnapshot exists",
    detail.variantSnapshot !== null,
  );
  if (detail.variantSnapshot) {
    TestValidator.equals(
      "variant snapshot sku_code",
      detail.variantSnapshot.sku_code,
      variant.code,
    );
    TestValidator.equals(
      "variant snapshot price",
      detail.variantSnapshot.price,
      variant.price ?? product.base_price,
    );
    for (const opt of variant.optionValues) {
      TestValidator.predicate(
        `variant snapshot option_values contains "${opt.key}"`,
        detail.variantSnapshot.option_values.includes(opt.key),
      );
    }
  }
  // Seller snapshot — frozen shop name and logo
  TestValidator.predicate(
    "sellerSnapshot exists",
    detail.sellerSnapshot !== null,
  );
  if (detail.sellerSnapshot) {
    TestValidator.equals(
      "seller snapshot shop_name",
      detail.sellerSnapshot.shop_name,
      seller.profile.shop_name,
    );
    TestValidator.equals(
      "seller snapshot logo_image_url",
      detail.sellerSnapshot.logo_image_url,
      seller.profile.logo_image_uri satisfies string | null | undefined as string | null | undefined,
    );
  }
}
