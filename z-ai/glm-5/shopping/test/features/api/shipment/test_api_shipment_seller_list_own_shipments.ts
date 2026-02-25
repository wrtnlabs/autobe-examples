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

/**
 * Test seller accessing their own shipment list with pagination.
 * This validates the core workflow where a seller can view shipments they have created.
 * Steps:
 * 1) Complete the prerequisite chain to create a shipment (seller approval, product creation,
 *    variant with inventory, customer order, shipment creation).
 * 2) Call PATCH /shoppingMall/seller/shipments with no filters.
 * 3) Verify response contains pagination metadata (current page, limit, total records, total pages).
 * 4) Verify response data array contains the created shipment with correct fields.
 * 5) Verify the seller in response matches the authenticated seller.
 * 6) Test pagination by requesting different pages.
 */
export async function test_api_shipment_seller_list_own_shipments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Setup Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12).toUpperCase(),
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<50000>
          >(),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Black", "White"]),
            },
            { key: "size", value: RandomGenerator.pick(["S", "M", "L", "XL"]) },
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. Seller adds inventory
  const inventory =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<100>
          >(),
          reason: "Initial stock for test",
        },
      },
    );
  typia.assert(inventory);
  // 7. Setup Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(customerAuth);
  // 8. Customer places order (using prepare function to handle address)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has items with 'paid' status
  TestValidator.predicate("order has paid items", order.orderItems.length > 0);
  TestValidator.predicate(
    "order items are paid",
    order.orderItems.every((item) => item.status === "paid"),
  );
  // 9. Seller creates shipment for order items
  const paidOrderItemIds = order.orderItems
    .filter((item) => item.status === "paid")
    .map((item) => item.id);
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: paidOrderItemIds,
          carrierName: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "Korea Post",
          ]),
          trackingNumber: RandomGenerator.alphaNumeric(16).toUpperCase(),
        },
      },
    );
  typia.assert(shipment);
  // 10. Seller lists their shipments
  const shipmentList = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderShipment.IRequest,
    },
  );
  typia.assert(shipmentList);
  // 11. Verify pagination metadata
  TestValidator.predicate(
    "pagination exists",
    shipmentList.pagination !== undefined,
  );
  TestValidator.equals("current page", shipmentList.pagination.current, 1);
  TestValidator.predicate("limit is valid", shipmentList.pagination.limit > 0);
  TestValidator.predicate(
    "total records >= 1",
    shipmentList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages >= 1",
    shipmentList.pagination.pages >= 1,
  );
  // 12. Verify shipment list contains created shipment
  TestValidator.predicate("data is array", Array.isArray(shipmentList.data));
  TestValidator.predicate("data not empty", shipmentList.data.length > 0);
  const foundShipment = shipmentList.data.find((s) => s.id === shipment.id);
  TestValidator.predicate(
    "created shipment found in list",
    foundShipment !== undefined,
  );
  // 13. Verify shipment summary fields
  if (foundShipment) {
    TestValidator.equals(
      "carrier name matches",
      foundShipment.carrierName,
      shipment.carrier_name,
    );
    TestValidator.equals(
      "tracking number matches",
      foundShipment.trackingNumber,
      shipment.tracking_number,
    );
    TestValidator.predicate(
      "shippedAt is valid date",
      foundShipment.shippedAt !== undefined,
    );
    TestValidator.equals(
      "deliveredAt is null for new shipment",
      foundShipment.deliveredAt,
      null,
    );
    TestValidator.equals(
      "deliveryConfirmationMethod is null",
      foundShipment.deliveryConfirmationMethod,
      null,
    );
    TestValidator.predicate("itemsCount > 0", foundShipment.itemsCount > 0);
    TestValidator.equals(
      "seller ID matches",
      foundShipment.seller.id,
      sellerAuth.id,
    );
    TestValidator.equals(
      "seller shop name matches",
      foundShipment.seller.shopName,
      sellerAuth.shopName,
    );
  }
  // 14. Test pagination - page 2 should be empty or have fewer items
  const page2Result = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallOrderShipment.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  // 15. Test filtering by status 'shipped'
  const shippedFilter =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        page: 1,
        limit: 10,
        status: "shipped",
      } satisfies IShoppingMallOrderShipment.IRequest,
    });
  typia.assert(shippedFilter);
  TestValidator.predicate(
    "all filtered shipments are not delivered",
    shippedFilter.data.every((s) => s.deliveredAt === null),
  );
  // 16. Verify default sort is by shipped_at DESC (most recent first)
  if (shipmentList.data.length > 1) {
    for (let i = 0; i < shipmentList.data.length - 1; i++) {
      const current = new Date(shipmentList.data[i].shippedAt).getTime();
      const next = new Date(shipmentList.data[i + 1].shippedAt).getTime();
      TestValidator.predicate("sorted by shippedAt DESC", current >= next);
    }
  }
}
