import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_order_detail_view_by_owning_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates a variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          code: RandomGenerator.alphaNumeric(16),
        },
      },
    );
  typia.assert(variant);
  // 6. Seller adds inventory stock
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock for order test",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 8. Customer adds the variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 9. Customer places the order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 2,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  // 10. Customer retrieves order detail by order code
  const orderDetail = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    { orderCode: order.code },
  );
  typia.assert(orderDetail);
  // 11. Validate order metadata
  TestValidator.equals("order code", orderDetail.code, order.code);
  TestValidator.equals("order status is paid", orderDetail.status, "paid");
  TestValidator.predicate(
    "total price is positive",
    orderDetail.total_price > 0,
  );
  // 12. Validate customer identity matches the authenticated customer
  TestValidator.equals(
    "customer id matches",
    orderDetail.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    orderDetail.customer.email,
    customer.email,
  );
  // 13. Validate frozen shipping address — every field is present and non-empty
  TestValidator.predicate(
    "recipient name present",
    orderDetail.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "phone number present",
    orderDetail.phone_number.length > 0,
  );
  TestValidator.predicate(
    "street address present",
    orderDetail.street_address.length > 0,
  );
  TestValidator.predicate("city present", orderDetail.city.length > 0);
  TestValidator.predicate(
    "state/province present",
    orderDetail.state_province.length > 0,
  );
  TestValidator.predicate(
    "postal code present",
    orderDetail.postal_code.length > 0,
  );
  TestValidator.predicate("country present", orderDetail.country.length > 0);
  // 14. Validate order items
  TestValidator.predicate(
    "has at least one order item",
    orderDetail.items.length >= 1,
  );
  const orderItem = orderDetail.items[0];
  TestValidator.equals("item quantity", orderItem.quantity, 2);
  TestValidator.equals("item status is paid", orderItem.status, "paid");
  TestValidator.predicate("item price is positive", orderItem.price > 0);
  // 15. Validate product snapshot — name frozen at purchase matches original
  TestValidator.predicate(
    "product snapshot exists",
    orderItem.productSnapshot !== null,
  );
  TestValidator.equals(
    "product snapshot name",
    orderItem.productSnapshot!.name,
    product.name,
  );
  // 16. Validate variant snapshot — SKU code frozen at purchase matches original
  TestValidator.predicate(
    "variant snapshot exists",
    orderItem.variantSnapshot !== null,
  );
  TestValidator.equals(
    "variant snapshot SKU code",
    orderItem.variantSnapshot!.sku_code,
    variant.code,
  );
  // 17. Validate seller snapshot — shop name frozen at purchase is present
  TestValidator.predicate(
    "seller snapshot exists",
    orderItem.sellerSnapshot !== null,
  );
  TestValidator.predicate(
    "seller shop name present",
    (orderItem.sellerSnapshot!.shop_name?.length ?? 0) > 0,
  );
  // 18. Validate that shipments array is initially empty for a new order
  TestValidator.equals("no shipments yet", orderDetail.shipments.length, 0);
}
