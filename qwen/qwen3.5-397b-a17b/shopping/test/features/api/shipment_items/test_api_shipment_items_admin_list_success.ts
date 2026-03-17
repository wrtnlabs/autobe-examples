import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
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
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an administrator can successfully retrieve a paginated list of order items within a specific shipment.
 *
 * This test verifies:
 * 1. Admin authentication and access to shipment items endpoint
 * 2. Complete order item details including quantity, unit_price, status
 * 3. Product and variant snapshots preserved at order time
 * 4. Seller information included in response
 * 5. All items show SHIPPED status after shipment creation
 * 6. Pagination metadata is correct
 * 7. Items are properly associated with the shipment
 */
export async function test_api_shipment_items_admin_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoin.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green", "Black"]),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 7. Customer adds variant to cart
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 8. Customer places order (using random address ID for test)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 9. Seller creates shipment with order items
  const orderItemIds = order.items.map((item) => item.id);
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment has items",
    shipment.items.length,
    order.items.length,
  );
  // 10. Admin retrieves shipment items list
  const shipmentItemsResponse =
    await api.functional.shoppingMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          sort: ["created_at,desc"],
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(shipmentItemsResponse);
  // 11. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    shipmentItemsResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page",
    shipmentItemsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is set",
    shipmentItemsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count",
    shipmentItemsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count",
    shipmentItemsResponse.pagination.pages >= 0,
  );
  // 12. Validate shipment items data
  TestValidator.predicate(
    "items array exists",
    Array.isArray(shipmentItemsResponse.data),
  );
  TestValidator.equals(
    "items count matches shipment",
    shipmentItemsResponse.data.length,
    shipment.items.length,
  );
  // 13. Validate each shipment item
  for (const shipmentItem of shipmentItemsResponse.data) {
    typia.assert(shipmentItem);
    // Validate shipment item structure
    TestValidator.predicate(
      "shipment item has id",
      shipmentItem.id !== undefined,
    );
    TestValidator.predicate(
      "shipment item has orderItem",
      shipmentItem.orderItem !== undefined,
    );
    const orderItem = shipmentItem.orderItem;
    // Validate order item details
    TestValidator.predicate(
      "order item has quantity",
      orderItem.quantity !== undefined,
    );
    TestValidator.predicate(
      "order item quantity is positive",
      orderItem.quantity >= 1,
    );
    TestValidator.predicate(
      "order item has unit_price",
      orderItem.unit_price !== undefined,
    );
    TestValidator.predicate(
      "order item unit_price is non-negative",
      orderItem.unit_price >= 0,
    );
    // Validate order item status is SHIPPED (shipment creation changes status)
    TestValidator.equals(
      "order item status is SHIPPED",
      orderItem.status,
      "SHIPPED",
    );
    // Validate nested order item data includes snapshots
    TestValidator.predicate(
      "product snapshot exists",
      orderItem.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "product snapshot has id",
      orderItem.productSnapshot.id !== undefined,
    );
    TestValidator.predicate(
      "product snapshot has name",
      orderItem.productSnapshot.name !== undefined,
    );
    TestValidator.predicate(
      "product snapshot has base_price",
      orderItem.productSnapshot.base_price !== undefined,
    );
    TestValidator.predicate(
      "variant snapshot exists",
      orderItem.productVariantSnapshot !== undefined,
    );
    TestValidator.predicate(
      "variant snapshot has id",
      orderItem.productVariantSnapshot.id !== undefined,
    );
    TestValidator.predicate(
      "variant snapshot has sku_code",
      orderItem.productVariantSnapshot.sku_code !== undefined,
    );
    TestValidator.predicate(
      "variant snapshot has option_values",
      orderItem.productVariantSnapshot.option_values !== undefined,
    );
    // Validate seller information
    TestValidator.predicate("seller exists", orderItem.seller !== undefined);
    TestValidator.predicate("seller has id", orderItem.seller.id !== undefined);
    TestValidator.predicate(
      "seller has shop_name",
      orderItem.seller.shop_name !== undefined,
    );
    // Validate order reference
    TestValidator.predicate(
      "order reference exists",
      orderItem.order !== undefined,
    );
    TestValidator.predicate(
      "order has orderNumber",
      orderItem.order.orderNumber !== undefined,
    );
    // Validate timestamps
    TestValidator.predicate(
      "created_at exists",
      orderItem.created_at !== undefined,
    );
  }
  // 14. Validate all items belong to the same shipment
  const allItemsFromSameShipment = shipmentItemsResponse.data.every(
    (item) => item.orderItem.order.id === order.id,
  );
  TestValidator.predicate(
    "all items belong to same order",
    allItemsFromSameShipment,
  );
}
