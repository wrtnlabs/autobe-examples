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
import { generate_random_mall_platform_administrator_shipments_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

/**
 * Retrieve a shipment-item assignment for an administrator.
 *
 * Validates the happy path for reading a shipment-item association through the administrator shipment-item detail endpoint. The test authenticates an administrator, creates a shipment through the supported shipment creation utility, and then retrieves the shipment-item assignment using the matching shipment context returned by the API.
 *
 * The scenario focuses on verifying that the returned association is tied to the requested shipment, that the nested shipment summary is consistent with the created shipment record, and that the nested order item summary is present with lifecycle timestamps for audit visibility.
 *
 * 1. Authenticate as an administrator with a fresh connection.
 * 2. Create a shipment using a valid shipment creation payload.
 * 3. Retrieve the shipment-item assignment with the created shipment context.
 * 4. Validate the returned association and nested shipment/order-item summaries.
 */
export async function test_api_shipment_item_retrieve_assignment(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email:
        `${RandomGenerator.alphabets(8)}@test.com` satisfies string as string &
          tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string as string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment =
    await generate_random_mall_platform_administrator_shipments_create(
      adminConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(16),
          trackingUrl: null,
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  const output =
    await api.functional.mallPlatform.administrator.shipments.items.getByShipmentidAndShipmentitemid(
      adminConnection,
      {
        shipmentId: shipment.id,
        shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "shipment id should match",
    output.shipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "shipment summary should be linked to the created shipment",
    output.shipment.carrierName === shipment.carrierName &&
      output.shipment.trackingNumber === shipment.trackingNumber,
  );
  TestValidator.predicate(
    "order item summary should include timestamps",
    output.orderItem.created_at.length > 0 &&
      output.orderItem.updated_at.length > 0,
  );
}
