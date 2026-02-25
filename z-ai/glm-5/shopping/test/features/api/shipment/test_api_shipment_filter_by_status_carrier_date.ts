import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_shipment_filter_by_status_carrier_date(
  connection: api.IConnection,
): Promise<void> {
  // Test shipment filtering by status, carrier, tracking number, and date range.
  // Steps:
  // 1. Setup: Create admin, seller (approved), products, variants, inventory
  // 2. Create customer and place orders
  // 3. Create multiple shipments with different carriers and statuses
  // 4. Confirm delivery for some shipments
  // 5. Test status filter (shipped vs delivered)
  // 6. Test carrier name filter
  // 7. Test tracking number filter
  // 8. Test date range filters
  // 9. Test combined filters
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Approve seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 3. Create product with variant and inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  const inventory =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      { params: { variantId: variant.id } },
    );
  typia.assert(inventory);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 5. Create orders and shipments with different carriers
  const carriers = ["FedEx", "UPS", "DHL"];
  const shipments: IShoppingMallOrderShipment[] = [];
  for (const carrier of carriers) {
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
    typia.assert(order);
    const orderItemId = order.orderItems[0].id;
    const shipment =
      await generate_random_shopping_mall_seller_sellers_me_shipments_create(
        sellerConnection,
        {
          body: {
            orderItemIds: [orderItemId],
            carrierName: carrier,
            trackingNumber: `TRACK-${carrier}-${RandomGenerator.alphabets(8)}`,
          },
        },
      );
    typia.assert(shipment);
    shipments.push(shipment);
  }
  // 6. Confirm delivery for first shipment (delivered status)
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipments[0].id },
    );
  typia.assert(deliveredShipment);
  // 7. Test status filter: shipped (undelivered)
  const shippedFilter =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { status: "shipped" },
    });
  typia.assert(shippedFilter);
  TestValidator.predicate(
    "shipped filter returns only undelivered shipments",
    shippedFilter.data.every((s) => s.deliveredAt === null),
  );
  // 8. Test status filter: delivered
  const deliveredFilter =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { status: "delivered" },
    });
  typia.assert(deliveredFilter);
  TestValidator.predicate(
    "delivered filter returns only delivered shipments",
    deliveredFilter.data.every((s) => s.deliveredAt !== null),
  );
  // 9. Test carrier name filter
  const fedexFilter = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    { body: { carrierName: "FedEx" } },
  );
  typia.assert(fedexFilter);
  TestValidator.predicate(
    "carrier name filter returns matching shipments",
    fedexFilter.data.every((s) =>
      s.carrierName.toLowerCase().includes("fedex"),
    ),
  );
  // 10. Test tracking number filter
  const trackingFilter =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { trackingNumber: shipments[1].tracking_number.substring(0, 6) },
    });
  typia.assert(trackingFilter);
  TestValidator.predicate(
    "tracking number filter returns matching shipments",
    trackingFilter.data.some((s) => s.id === shipments[1].id),
  );
  // 11. Test date range filter (shipped date)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeFilter =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        shippedAtFrom: yesterday.toISOString(),
        shippedAtTo: tomorrow.toISOString(),
      },
    });
  typia.assert(dateRangeFilter);
  TestValidator.predicate(
    "date range filter returns shipments within range",
    dateRangeFilter.data.length > 0,
  );
  // 12. Test combined filters: delivered + carrier
  const combinedFilter =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { status: "delivered", carrierName: "FedEx" },
    });
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedFilter.data.every(
      (s) =>
        s.deliveredAt !== null && s.carrierName.toLowerCase().includes("fedex"),
    ),
  );
  // 13. Test pagination
  const paginatedResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { page: 1, limit: 2 },
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limits results correctly",
    paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination provides correct metadata",
    paginatedResult.pagination.current === 1,
  );
}
