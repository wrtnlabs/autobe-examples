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
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_tracking_info } from "../../../prepare/prepare_random_shopping_mall_tracking_info";

export async function test_api_shipment_delete_active_package(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(authorized);
  const trackingInfo = {
    carrier_name: RandomGenerator.name(),
    tracking_number: RandomGenerator.alphaNumeric(16),
    tracking_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallTrackingInfo.ICreate;
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingInfo,
        },
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment belongs to authenticated seller",
    shipment.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "tracking info carrier matches input",
    shipment.trackingInfo.carrier_name,
    trackingInfo.carrier_name,
  );
  TestValidator.equals(
    "tracking info number matches input",
    shipment.trackingInfo.tracking_number,
    trackingInfo.tracking_number,
  );
  TestValidator.equals(
    "tracking info url matches input",
    shipment.trackingInfo.tracking_url,
    trackingInfo.tracking_url ?? null,
  );
  TestValidator.equals(
    "tracking info linked shipment id matches",
    shipment.trackingInfo.shipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "shipment has at least one grouped order item",
    shipment.orderItems.length > 0,
  );
  TestValidator.predicate(
    "all grouped order items reference created shipment",
    shipment.orderItems.every(
      (item) => item.shipment !== null && item.shipment.id === shipment.id,
    ),
  );
  TestValidator.predicate(
    "all grouped order items belong to same seller",
    shipment.orderItems.every((item) => item.seller.id === shipment.seller.id),
  );
  const erased: void = await api.functional.shoppingMall.seller.shipments.erase(
    sellerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  TestValidator.equals("delete returns no response body", erased, undefined);
  await TestValidator.httpError(
    "deleted shipment cannot be deleted twice",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.erase(
        sellerConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
}
