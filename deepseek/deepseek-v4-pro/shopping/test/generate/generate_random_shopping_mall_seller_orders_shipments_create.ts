import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment } from "../prepare/prepare_random_shopping_mall_shipment";

/**
 * Generate a random shipment for E2E testing.
 *
 * Creates a shipment for an existing order by calling the prepare function
 * to generate valid shipment creation data with random order item IDs,
 * carrier name, and tracking number. The shipment bundles one or more paid
 * order items belonging to the authenticated seller into a physical package.
 *
 * Requires a valid order ID in the path parameters — the order must exist
 * and contain paid order items owned by the authenticated seller. Upon
 * successful creation, all included order items transition to "shipped"
 * status and share the same carrier and tracking information.
 */
export async function generate_random_shopping_mall_seller_orders_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipment.ICreate> | undefined;
    params: {
      orderId: string;
    };
  },
): Promise<IShoppingMallShipment> {
  const prepared: IShoppingMallShipment.ICreate =
    prepare_random_shopping_mall_shipment(props.body);
  return await api.functional.shoppingMall.seller.orders.shipments.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
