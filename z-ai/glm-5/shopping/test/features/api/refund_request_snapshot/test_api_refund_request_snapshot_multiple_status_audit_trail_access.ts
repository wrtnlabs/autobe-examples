import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_snapshot_multiple_status_audit_trail_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator accessing complete audit trail when a refund request
   * undergoes multiple status changes. This test validates that:
   * 1. Snapshots are created when sellers respond to refund requests
   * 2. Administrators can view snapshots for audit purposes
   * 3. Snapshot data accurately captures the refund request state
   */
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Seller setup - create seller and product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Customer setup - create customer, address, and order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order);
  // 4. Seller creates shipment for the order items
  // Note: Since order items are not directly accessible from order DTO,
  // we use the shipment generation with random order item IDs for testing
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // 5. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  // 6. Customer creates refund request for a delivered item
  // Use the first order item from the shipment
  const orderItem = shipment.orderItems[0]!;
  const refundReason = RandomGenerator.paragraph({ sentences: 5 });
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals("initial status", refundRequest.status, "pending");
  TestValidator.equals("reason preserved", refundRequest.reason, refundReason);
  // 7. Seller rejects the refund request - this creates a snapshot
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "reject",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRefundRequest);
  TestValidator.equals(
    "status after rejection",
    rejectedRefundRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "responded_at is set",
    rejectedRefundRequest.respondedAt !== null,
  );
  // 8. Verify snapshot was created
  TestValidator.predicate(
    "snapshots array has at least one entry",
    rejectedRefundRequest.snapshots.length > 0,
  );
  const snapshot = rejectedRefundRequest.snapshots[0]!;
  typia.assert(snapshot);
  // 9. Administrator retrieves the snapshot for audit trail
  const adminSnapshot =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.at(
      adminConnection,
      { snapshotId: snapshot.id },
    );
  typia.assert(adminSnapshot);
  // 10. Validate snapshot captures accurate state
  TestValidator.equals("snapshot id matches", adminSnapshot.id, snapshot.id);
  TestValidator.equals(
    "snapshot reason preserved",
    adminSnapshot.reason,
    refundReason,
  );
  TestValidator.equals(
    "snapshot status is rejected",
    adminSnapshot.status,
    "rejected",
  );
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    adminSnapshot.created_at !== null,
  );
}
