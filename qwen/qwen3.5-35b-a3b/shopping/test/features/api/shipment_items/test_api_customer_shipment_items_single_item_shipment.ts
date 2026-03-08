import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_items_single_item_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins account
  const customerConnection: api.IConnection = { host: connection.host };
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: referrer,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Retrieve customer's shipments list
  const shipmentsList: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerConnection,
      {
        body: typia.random<IEcommerceMallShipment.IRequest>(),
      },
    );
  typia.assert(shipmentsList);
  // Validate shipments list structure
  TestValidator.predicate(
    "shipments list has pagination",
    shipmentsList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "shipments list has valid page info",
    shipmentsList.pagination.pages >= 0,
  );
  // 3. Select a shipment (first shipment from list)
  if (shipmentsList.data.length === 0) {
    throw new Error("No shipments found for customer");
  }
  const singleShipment: IEcommerceMallShipment.ISummary = shipmentsList.data[0];
  // 4. Get specific shipment details to confirm carrier and tracking info
  const shipmentDetails: IEcommerceMallShipment =
    await api.functional.ecommerceMall.customer.shipments.at(
      customerConnection,
      { shipmentId: singleShipment.id },
    );
  typia.assert(shipmentDetails);
  // Validate shipment has carrier and tracking information
  TestValidator.equals(
    "shipment has carrier name",
    shipmentDetails.carrierName,
    singleShipment.carrier_name,
  );
  TestValidator.equals(
    "shipment has tracking number",
    shipmentDetails.trackingNumber,
    singleShipment.tracking_number,
  );
  // Validate order and seller references match
  TestValidator.equals(
    "shipment order id matches summary",
    shipmentDetails.order.id,
    singleShipment.order.id,
  );
  TestValidator.equals(
    "shipment seller id matches summary",
    shipmentDetails.seller.id,
    singleShipment.seller.id,
  );
  // 5. Retrieve shipment items for the single-item shipment
  const shipmentItems: IEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.shipmentItems.items.getItems(
      customerConnection,
      { shipmentId: singleShipment.id },
    );
  typia.assert(shipmentItems);
  // 6. Validate shipment item references the correct shipment
  TestValidator.equals(
    "shipment item has correct shipment id",
    shipmentItems.shipment.id,
    singleShipment.id,
  );
  TestValidator.equals(
    "shipment item carrier name matches",
    shipmentItems.shipment.carrier_name,
    shipmentDetails.carrierName,
  );
  TestValidator.equals(
    "shipment item tracking number matches",
    shipmentItems.shipment.tracking_number,
    shipmentDetails.trackingNumber,
  );
  // 7. Validate order item snapshot data
  TestValidator.predicate(
    "order item has valid quantity (>= 1)",
    shipmentItems.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item has valid unit price (> 0)",
    shipmentItems.orderItem.unitPrice > 0,
  );
  TestValidator.equals(
    "order item status is shipped",
    shipmentItems.orderItem.itemStatus,
    "shipped",
  );
  TestValidator.equals(
    "order item parent order matches shipment",
    shipmentItems.orderItem.order.id,
    shipmentDetails.order.id,
  );
  // 8. Validate snapshot data exists (product, variant, sellerProfile)
  TestValidator.predicate(
    "product snapshot exists and has content",
    shipmentItems.orderItem.productSnapshot.length > 0,
  );
  TestValidator.predicate(
    "variant snapshot exists and has content",
    shipmentItems.orderItem.variantSnapshot.length > 0,
  );
  TestValidator.predicate(
    "seller profile snapshot exists and has content",
    shipmentItems.orderItem.sellerProfileSnapshot.length > 0,
  );
  // 9. Validate timestamps are valid date-time format
  TestValidator.predicate(
    "shipment item created_at is valid date-time",
    !isNaN(Date.parse(shipmentItems.created_at)),
  );
  TestValidator.predicate(
    "shipment item updated_at is valid date-time",
    !isNaN(Date.parse(shipmentItems.updated_at)),
  );
  TestValidator.predicate(
    "shipment created_at is valid date-time",
    !isNaN(Date.parse(shipmentDetails.createdAt)),
  );
  TestValidator.predicate(
    "shipment updated_at is valid date-time",
    !isNaN(Date.parse(shipmentDetails.updatedAt)),
  );
}
