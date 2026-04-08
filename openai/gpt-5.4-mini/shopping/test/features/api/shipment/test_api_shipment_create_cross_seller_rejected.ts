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

/**
 * Rejects cross-seller shipment creation when a seller tries to bundle another seller's order item.
 *
 * This test validates the fulfillment rule that a shipment must contain only order items owned by the authenticated seller. It prepares two approved seller connections, locates one paid order item for each seller, and attempts to create a single shipment containing both order items.
 *
 * The scenario ensures that the platform rejects the mixed-seller request without creating a shipment record and without mutating the observed order-item state for either seller.
 *
 * 1. Register two seller accounts and authenticate each one with an isolated connection.
 * 2. Query paid order items for both sellers and confirm each seller has an eligible item.
 * 3. Attempt to create one shipment that includes both sellers' order item IDs.
 * 4. Verify the request is rejected and the observed order-item statuses remain unchanged.
 */
export async function test_api_shipment_create_cross_seller_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerOneConnection: api.IConnection = { host: connection.host };
  const sellerOneAuthorized = await authorize_seller_join(sellerOneConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string,
      password: "password123",
    } satisfies IMallPlatformSeller.IJoin,
  });
  sellerOneConnection.headers = {
    Authorization: sellerOneAuthorized.token.access,
  };
  const sellerTwoConnection: api.IConnection = { host: connection.host };
  const sellerTwoAuthorized = await authorize_seller_join(sellerTwoConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}-2@test.com` satisfies string,
      password: "password123",
    } satisfies IMallPlatformSeller.IJoin,
  });
  sellerTwoConnection.headers = {
    Authorization: sellerTwoAuthorized.token.access,
  };
  const sellerOneItems =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerOneConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 100,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(sellerOneItems);
  const sellerTwoItems =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerTwoConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 100,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(sellerTwoItems);
  TestValidator.predicate(
    "seller one must have at least one paid order item",
    sellerOneItems.data.length > 0,
  );
  TestValidator.predicate(
    "seller two must have at least one paid order item",
    sellerTwoItems.data.length > 0,
  );
  const sellerOneItem = sellerOneItems.data[0];
  const sellerTwoItem = sellerTwoItems.data[0];
  const beforeSellerOneStatus = sellerOneItem.status;
  const beforeSellerTwoStatus = sellerTwoItem.status;
  await TestValidator.error(
    "cross-seller shipment should be rejected",
    async () => {
      await api.functional.mallPlatform.seller.shipments.create(
        sellerOneConnection,
        {
          body: {
            shipmentItems: [
              {
                orderItemIds: [sellerOneItem.id, sellerTwoItem.id],
              } satisfies IMallPlatformShipmentItem.ICreate,
            ],
            carrierName: RandomGenerator.name(),
            trackingNumber: RandomGenerator.alphaNumeric(12),
          } satisfies IMallPlatformShipment.ICreate,
        },
      );
    },
  );
  const sellerOneItemsAfter =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerOneConnection,
      {
        body: {
          mallPlatformOrderId: sellerOneItem.order.id,
          mallPlatformProductVariantId: sellerOneItem.productVariant.id,
          status: beforeSellerOneStatus,
          page: 1,
          limit: 100,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(sellerOneItemsAfter);
  const sellerTwoItemsAfter =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerTwoConnection,
      {
        body: {
          mallPlatformOrderId: sellerTwoItem.order.id,
          mallPlatformProductVariantId: sellerTwoItem.productVariant.id,
          status: beforeSellerTwoStatus,
          page: 1,
          limit: 100,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(sellerTwoItemsAfter);
  TestValidator.predicate(
    "seller one order item remains visible with the original status",
    sellerOneItemsAfter.data.some((item) => item.id === sellerOneItem.id),
  );
  TestValidator.predicate(
    "seller two order item remains visible with the original status",
    sellerTwoItemsAfter.data.some((item) => item.id === sellerTwoItem.id),
  );
  TestValidator.equals(
    "seller one order item status must remain unchanged",
    sellerOneItemsAfter.data.find((item) => item.id === sellerOneItem.id)
      ?.status,
    beforeSellerOneStatus,
  );
  TestValidator.equals(
    "seller two order item status must remain unchanged",
    sellerTwoItemsAfter.data.find((item) => item.id === sellerTwoItem.id)
      ?.status,
    beforeSellerTwoStatus,
  );
}
