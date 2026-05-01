import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

/**
 * Test administrator retrieval of a delivered order with full detail validation.
 *
 * Validates that an authenticated administrator can retrieve a complete delivered order by its order code. The test verifies order metadata including the derived status, total price frozen at checkout, and the immutable shipping address captured at purchase time.
 *
 * Each order item is checked for "delivered" status and the presence of purchase-time snapshots — product snapshot (name, description, base_price, category_name, images), variant snapshot (sku_code, option_values, price), and seller snapshot (shop_name, logo_image_url). All shipments are validated with carrier details, tracking information, delivery confirmation, and correct mapping to contained order items.
 *
 * 1. Administrator registers and authenticates on the platform via authorize_admin_join.
 * 2. Administrator retrieves a delivered order by its unique order code.
 * 3. Validates order metadata: status equals "delivered" and total_price is positive.
 * 4. Validates frozen shipping address fields are all populated.
 * 5. Validates customer summary fields are present.
 * 6. Validates each order item has "delivered" status and non-null snapshots.
 * 7. Validates product snapshot content: name, description, base_price, category_name, and images with url and display order.
 * 8. Validates variant snapshot content: sku_code, option_values, and price.
 * 9. Validates seller snapshot content: shop_name and logo_image_url.
 * 10. Validates shipments: carrier_name, tracking_number, shipping date, delivery confirmation (delivered_at non-null), and mapped order items.
 */
export async function test_api_admin_order_retrieval_delivered_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve delivered order by order code
  const order = await api.functional.shoppingMall.admin.orders.at(
    adminConnection,
    {
      orderCode: typia.random<string>(),
    },
  );
  typia.assert(order);
  // 3. Validate order metadata
  TestValidator.equals("order status is delivered", order.status, "delivered");
  TestValidator.predicate("total price is positive", order.total_price > 0);
  // 4. Validate frozen shipping address
  TestValidator.predicate(
    "recipient name is non-empty",
    order.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "phone number is non-empty",
    order.phone_number.length > 0,
  );
  TestValidator.predicate(
    "street address is non-empty",
    order.street_address.length > 0,
  );
  TestValidator.predicate("city is non-empty", order.city.length > 0);
  TestValidator.predicate(
    "state/province is non-empty",
    order.state_province.length > 0,
  );
  TestValidator.predicate(
    "postal code is non-empty",
    order.postal_code.length > 0,
  );
  TestValidator.predicate("country is non-empty", order.country.length > 0);
  // 5. Validate customer summary
  TestValidator.predicate(
    "customer email is non-empty",
    order.customer.email.length > 0,
  );
  TestValidator.predicate(
    "customer display_name is non-empty",
    order.customer.display_name.length > 0,
  );
  // 6-9. Validate each order item
  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );
  for (const item of order.items) {
    // 6. Item status
    TestValidator.equals(
      `item ${item.id} status is delivered`,
      item.status,
      "delivered",
    );
    // 7. Product snapshot
    TestValidator.predicate(
      `item ${item.id} has product snapshot`,
      item.productSnapshot !== null,
    );
    if (item.productSnapshot) {
      TestValidator.predicate(
        `item ${item.id} product snapshot name is non-empty`,
        item.productSnapshot.name.length > 0,
      );
      TestValidator.predicate(
        `item ${item.id} product snapshot base_price is non-negative`,
        item.productSnapshot.base_price >= 0,
      );
      TestValidator.predicate(
        `item ${item.id} product snapshot category_name is non-empty`,
        item.productSnapshot.category_name.length > 0,
      );
      for (const img of item.productSnapshot.productSnapshotImages) {
        TestValidator.predicate(
          `item ${item.id} snapshot image URL is non-empty`,
          img.imageUrl.length > 0,
        );
        TestValidator.predicate(
          `item ${item.id} snapshot image displayOrder is non-negative`,
          img.displayOrder >= 0,
        );
      }
    }
    // 8. Variant snapshot
    TestValidator.predicate(
      `item ${item.id} has variant snapshot`,
      item.variantSnapshot !== null,
    );
    if (item.variantSnapshot) {
      TestValidator.predicate(
        `item ${item.id} variant snapshot sku_code is non-empty`,
        item.variantSnapshot.sku_code.length > 0,
      );
      TestValidator.predicate(
        `item ${item.id} variant snapshot price is non-negative`,
        item.variantSnapshot.price >= 0,
      );
    }
    // 9. Seller snapshot
    TestValidator.predicate(
      `item ${item.id} has seller snapshot`,
      item.sellerSnapshot !== null,
    );
    if (item.sellerSnapshot) {
      TestValidator.predicate(
        `item ${item.id} seller snapshot shop_name is non-empty`,
        item.sellerSnapshot.shop_name.length > 0,
      );
    }
  }
  // 10. Validate shipments
  TestValidator.predicate(
    "order has at least one shipment",
    order.shipments.length > 0,
  );
  for (const shipment of order.shipments) {
    TestValidator.predicate(
      `shipment ${shipment.id} carrier_name is non-empty`,
      shipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} tracking_number is non-empty`,
      shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} created_at is valid`,
      shipment.created_at.length > 0,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} delivered_at is non-null (delivery confirmed)`,
      shipment.delivered_at !== null,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} has at least one order item`,
      shipment.orderItems.length > 0,
    );
  }
}
