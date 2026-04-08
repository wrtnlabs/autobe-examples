import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_shipment_item_reassignment_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful reassignment of a shipment-item association to another shipment.
   *
   * Verifies that an administrator can authenticate, move a shipment-item junction
   * row to a different shipment for the same seller, and receive an updated
   * shipment-item response while preserving the attached order item and shipment
   * header data.
   *
   * 1. Register and authenticate an administrator.
   * 2. Prepare the original shipment, alternate shipment, and shipment-item row.
   * 3. Reassign the shipment-item to the alternate shipment.
   * 4. Validate that only the junction row changed and the shipment metadata stayed intact.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const seller: IMallPlatformSeller.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    status: "approved",
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  const customer: IMallPlatformCustomer.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const order: IMallPlatformOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customer,
    orderNumber: RandomGenerator.alphabets(12),
    status: "paid",
    totalAmount: 10000,
    recipientName: RandomGenerator.name(),
    recipientPhone: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(),
    stateProvince: RandomGenerator.name(),
    postalCode: RandomGenerator.alphabets(6),
    country: "Korea",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  const originalShipment: IMallPlatformShipment.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    seller,
    order,
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(18),
    trackingUrl: null,
    status: "shipped",
    shippedAt: new Date().toISOString(),
    deliveredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  const alternateShipment: IMallPlatformShipment.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    seller,
    order,
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(18),
    trackingUrl: null,
    status: "shipped",
    shippedAt: new Date().toISOString(),
    deliveredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  const orderItem: IMallPlatformOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    status: "paid",
    order,
    productVariant: {
      id: typia.random<string & tags.Format<"uuid">>(),
      product: {
        id: typia.random<string & tags.Format<"uuid">>(),
        sellerAccount: {
          id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          approvalStatus: "approved",
          rejectionReason: null,
          suspendedAt: null,
          deletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        category: null,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        basePrice: 10000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
      skuCode: RandomGenerator.alphabets(8),
      optionValues: "Red / Large",
      priceOverride: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    },
    seller,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const shipmentItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const shipmentItem: IMallPlatformShipmentItem = {
    id: shipmentItemId,
    shipment: originalShipment,
    orderItem,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  typia.assert(originalShipment);
  typia.assert(alternateShipment);
  typia.assert(orderItem);
  typia.assert(shipmentItem);
  const updated =
    await api.functional.mallPlatform.administrator.shipments.items.putByShipmentidAndShipmentitemid(
      adminConnection,
      {
        shipmentId: originalShipment.id,
        shipmentItemId,
        body: {
          shipmentId: alternateShipment.id,
        } satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "shipment item id preserved",
    updated.id,
    shipmentItemId,
  );
  TestValidator.equals(
    "shipment reassigned to requested shipment",
    updated.shipment.id,
    alternateShipment.id,
  );
  TestValidator.equals(
    "order item reference preserved",
    updated.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "target shipment carrier name preserved",
    updated.shipment.carrierName,
    alternateShipment.carrierName,
  );
  TestValidator.equals(
    "target shipment tracking number preserved",
    updated.shipment.trackingNumber,
    alternateShipment.trackingNumber,
  );
  TestValidator.equals(
    "target shipment status preserved",
    updated.shipment.status,
    alternateShipment.status,
  );
  TestValidator.notEquals(
    "shipment reference changed from original",
    updated.shipment.id,
    originalShipment.id,
  );
}
