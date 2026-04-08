import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test successful retrieval of delivery confirmation details for a shipment that has been delivered.
 * Prerequisites: Admin account authenticated, a shipment exists with confirmed delivery status.
 * Test steps: 1) Authenticate as admin using authorize_admin_join utility. 2) Create a shipment via generate_random_ecommerce_mall_admin_shipments_create utility. 3) Confirm delivery via PUT /ecommerceMall/admin/shipments/{shipmentId}/delivery using admin connection. 4) Call GET /ecommerceMall/admin/shipments/{shipmentId}/delivery to retrieve the delivery confirmation.
 * Expected outcomes: Response contains complete delivery details including delivery timestamp, confirmation status (delivered), and shipment summary.
 */
export async function test_api_admin_shipment_delivery_retrieve_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a shipment
  const shipment = await generate_random_ecommerce_mall_admin_shipments_create(
    adminConnection,
    {},
  );
  // 3. Confirm delivery
  const deliveryConfirmation =
    await api.functional.ecommerceMall.admin.shipments.delivery.confirm(
      adminConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // 4. Retrieve delivery confirmation
  const retrievedDelivery =
    await api.functional.ecommerceMall.admin.shipments.delivery.at(
      adminConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedDelivery);
}
