import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_shipments_tracking_infos_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_tracking_infos_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_tracking_info } from "../../../prepare/prepare_random_shopping_mall_tracking_info";

export async function test_api_tracking_info_duplicate_for_shipment_conflict(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const initialCarrierName = `carrier-${RandomGenerator.alphabets(8)}`;
  const initialTrackingNumber = `tn-${RandomGenerator.alphaNumeric(12)}`;
  const initialTrackingUrl = typia.random<string & tags.Format<"uri">>();
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        trackingInfo: {
          carrier_name: initialCarrierName,
          tracking_number: initialTrackingNumber,
          tracking_url: initialTrackingUrl,
        } satisfies IShoppingMallTrackingInfo.ICreate,
      },
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment retains initial carrier name",
    shipment.trackingInfo.carrier_name,
    initialCarrierName,
  );
  TestValidator.equals(
    "shipment retains initial tracking number",
    shipment.trackingInfo.tracking_number,
    initialTrackingNumber,
  );
  TestValidator.equals(
    "shipment retains initial tracking url",
    shipment.trackingInfo.tracking_url,
    initialTrackingUrl,
  );
  TestValidator.equals(
    "tracking info belongs to created shipment",
    shipment.trackingInfo.shipment.id,
    shipment.id,
  );
  const duplicateCarrierName = `carrier-${RandomGenerator.alphabets(8)}`;
  const duplicateTrackingNumber = `tn-${RandomGenerator.alphaNumeric(12)}`;
  const duplicateTrackingUrl = typia.random<string & tags.Format<"uri">>();
  await TestValidator.error(
    "duplicate tracking info for shipment is rejected",
    async () => {
      await generate_random_shopping_mall_seller_shipments_tracking_infos_create(
        sellerConnection,
        {
          params: {
            shipmentId: shipment.id,
          },
          body: {
            carrier_name: duplicateCarrierName,
            tracking_number: duplicateTrackingNumber,
            tracking_url: duplicateTrackingUrl,
          } satisfies IShoppingMallTrackingInfo.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original carrier name remains unchanged after duplicate rejection",
    shipment.trackingInfo.carrier_name,
    initialCarrierName,
  );
  TestValidator.equals(
    "original tracking number remains unchanged after duplicate rejection",
    shipment.trackingInfo.tracking_number,
    initialTrackingNumber,
  );
  TestValidator.equals(
    "original tracking url remains unchanged after duplicate rejection",
    shipment.trackingInfo.tracking_url,
    initialTrackingUrl,
  );
}
