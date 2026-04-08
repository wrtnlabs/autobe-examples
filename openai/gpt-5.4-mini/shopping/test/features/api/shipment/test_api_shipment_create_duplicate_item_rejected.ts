import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_create_duplicate_item_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const orderItemsPage =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 50,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsPage);
  TestValidator.predicate(
    "seller has at least one eligible paid order item",
    orderItemsPage.data.length > 0,
  );
  const eligibleItem = orderItemsPage.data[0]!;
  const shipmentBody = {
    carrierName: RandomGenerator.name(),
    trackingNumber: RandomGenerator.alphaNumeric(16),
    shipmentItems: [{ orderItemIds: [eligibleItem.id] }],
  } satisfies IMallPlatformShipment.ICreate;
  const firstShipment =
    await api.functional.mallPlatform.seller.shipments.create(
      sellerConnection,
      {
        body: shipmentBody,
      },
    );
  typia.assert(firstShipment);
  TestValidator.equals(
    "first shipment contains exactly one shipment item",
    firstShipment.shipmentItems.length,
    1,
  );
  TestValidator.equals(
    "first shipment references the original order item",
    firstShipment.shipmentItems[0]!.orderItem.id,
    eligibleItem.id,
  );
  await TestValidator.httpError(
    "reusing an already shipped order item must be rejected",
    [400, 409],
    async () => {
      await api.functional.mallPlatform.seller.shipments.create(
        sellerConnection,
        {
          body: {
            carrierName: RandomGenerator.name(),
            trackingNumber: RandomGenerator.alphaNumeric(16),
            shipmentItems: [{ orderItemIds: [eligibleItem.id] }],
          } satisfies IMallPlatformShipment.ICreate,
        },
      );
    },
  );
  const refreshedOrderItemsPage =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          mallPlatformOrderId: firstShipment.order.id,
          status: "shipped",
          page: 1,
          limit: 50,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(refreshedOrderItemsPage);
  TestValidator.predicate(
    "original order item remains present after the rejected duplicate attempt",
    refreshedOrderItemsPage.data.some((item) => item.id === eligibleItem.id),
  );
}
