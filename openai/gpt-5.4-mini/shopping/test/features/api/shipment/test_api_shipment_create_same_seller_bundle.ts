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

export async function test_api_shipment_create_same_seller_bundle(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com` satisfies string,
      password: "1234!Aa",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const preparedItems =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          mallPlatformSellerId: seller.id,
          status: "paid",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(preparedItems);
  TestValidator.predicate(
    "prepared order item list should contain at least two eligible items",
    preparedItems.data.length >= 2,
  );
  const selectedItems = preparedItems.data.slice(0, 2);
  const carrierName = RandomGenerator.name();
  const trackingNumber = RandomGenerator.alphaNumeric(12);
  const shipment = await api.functional.mallPlatform.seller.shipments.create(
    sellerConnection,
    {
      body: {
        carrierName,
        trackingNumber,
        shipmentItems: selectedItems.map((item) => ({
          orderItemIds: [item.id],
        })) satisfies IMallPlatformShipmentItem.ICreate[],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment seller matches authenticated seller",
    shipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "shipment carrier name is persisted",
    shipment.carrierName,
    carrierName,
  );
  TestValidator.equals(
    "shipment tracking number is persisted",
    shipment.trackingNumber,
    trackingNumber,
  );
  TestValidator.equals(
    "shipment item count matches selected order items",
    shipment.shipmentItems.length,
    selectedItems.length,
  );
  TestValidator.equals(
    "shipment order matches the bundled order",
    shipment.order.id,
    selectedItems[0].order.id,
  );
  TestValidator.predicate(
    "every shipment item should reference a selected order item",
    shipment.shipmentItems.every((entry) =>
      selectedItems.some((item) => item.id === entry.orderItem.id),
    ),
  );
  TestValidator.predicate(
    "shipment must contain at least one item",
    shipment.shipmentItems.length > 0,
  );
}
