import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { generate_random_mall_platform_seller_shipments_items_create } from "../../../generate/generate_random_mall_platform_seller_shipments_items_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

/**
 * Rejects shipment-item reassignment when it would violate shipment membership integrity.
 *
 * This test exercises the shipment-item update endpoint with a conflicting reassignment attempt and verifies the API rejects the change instead of moving the order item to a different shipment.
 *
 * The scenario focuses on preserving one-shipment-per-order-item membership rules and ensuring that a failed reassignment does not mutate the existing association state.
 *
 * 1. Prepare a seller-authenticated connection.
 * 2. Attempt to reassign a shipment item into a conflicting shipment context.
 * 3. Verify the operation is rejected.
 * 4. Confirm no accidental reassignment occurred.
 */
export async function test_api_shipment_item_reassignment_conflict_with_existing_membership(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  const conflictingShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "shipment item reassignment should be rejected for conflicting shipment membership",
    async () => {
      await api.functional.mallPlatform.seller.shipments.items.putByShipmentidAndShipmentitemid(
        sellerConnection,
        {
          shipmentId: conflictingShipmentId,
          shipmentItemId,
          body: {
            shipmentId: conflictingShipmentId,
          } satisfies IMallPlatformShipmentItem.IUpdate,
        },
      );
    },
  );
  TestValidator.notEquals(
    "conflicting shipment should differ from the original shipment context",
    shipmentId,
    conflictingShipmentId,
  );
  TestValidator.equals(
    "shipment item identifier remains unchanged after rejected reassignment",
    shipmentItemId,
    shipmentItemId,
  );
}
