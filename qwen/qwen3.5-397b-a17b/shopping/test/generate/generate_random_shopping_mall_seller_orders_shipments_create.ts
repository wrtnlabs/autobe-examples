import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment } from "../prepare/prepare_random_shopping_mall_shipment";

/**
 * Generate a random shipment for an order via the API for E2E testing.
 *
 * Creates a shipment by preparing random shipment data using the prepare function,
 * then calling the shipment creation endpoint. The shipment includes order item IDs,
 * carrier name, and tracking number. All order items must belong to the authenticated
 * seller and have 'paid' status.
 *
 * The orderId URL parameter identifies which order the shipment belongs to. The seller
 * identity is determined from the authentication context, not from the request body.
 * When the shipment is created, all included order items automatically transition to
 * 'shipped' status.
 *
 * @param connection The API connection for authentication and server targeting
 * @param props.body Optional partial shipment creation data to customize test values
 * @param props.params.orderId The order UUID that this shipment belongs to
 * @returns The created shipment entity with tracking information and timestamps
 */
export async function generate_random_shopping_mall_seller_orders_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipment.ICreate>;
    params: {
      orderId: string;
    };
  },
): Promise<IShoppingMallShipment> {
  const prepared: IShoppingMallShipment.ICreate =
    prepare_random_shopping_mall_shipment(props.body);
  const result: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderId: props.params.orderId,
        body: prepared,
      },
    );
  return result;
}
