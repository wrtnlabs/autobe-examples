import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_delivery_confirmation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 2. Create a prerequisite shipment using utility function
  const shipment =
    await generate_random_ecommerce_mall_super_admin_shipments_create(
      superAdminConnection,
      {
        body: {
          carrierName: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "USPS",
          ] as const),
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 3. Execute delivery confirmation
  const deliveryConfirmation =
    await api.functional.ecommerceMall.superAdmin.shipments.delivery.confirm(
      superAdminConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // 4. Validate business logic
  // Verify the delivery was manually confirmed (not auto-delivered)
  TestValidator.equals(
    "isAutoDelivered should be false",
    deliveryConfirmation.isAutoDelivered,
    false,
  );
  // Verify the shipment relationship is properly returned
  TestValidator.equals(
    "shipment ID matches",
    deliveryConfirmation.shipment.id,
    shipment.id,
  );
  // Verify delivery timestamp is recorded
  TestValidator.predicate(
    "deliveredAt timestamp exists",
    () =>
      deliveryConfirmation.deliveredAt !== null &&
      deliveryConfirmation.deliveredAt !== undefined,
  );
}
