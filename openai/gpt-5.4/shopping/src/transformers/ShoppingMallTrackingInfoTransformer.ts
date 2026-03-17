import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallShipmentAtSummaryTransformer } from "./ShoppingMallShipmentAtSummaryTransformer";

export namespace ShoppingMallTrackingInfoTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallTrackingInfo> {
    return {
      id: input.id,
      shipment: await ShoppingMallShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      tracking_url: input.tracking_url ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
        carrier_name: true,
        tracking_number: true,
        tracking_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_tracking_infosFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_tracking_infosGetPayload<
    ReturnType<typeof select>
  >;
}
