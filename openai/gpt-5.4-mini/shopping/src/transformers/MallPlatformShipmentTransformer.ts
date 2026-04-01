import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformOrderAtSummaryTransformer } from "./MallPlatformOrderAtSummaryTransformer";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";

export namespace MallPlatformShipmentTransformer {
  export type Payload = Prisma.mall_platform_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        status: true,
        shipped_at: true,
        created_at: true,
        seller: MallPlatformSellerAtSummaryTransformer.select(),
        order: MallPlatformOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformShipment> {
    return {
      id: input.id,
      order: await MallPlatformOrderAtSummaryTransformer.transform(input.order),
      seller: await MallPlatformSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      status: input.status,
      shipped_at: input.shipped_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
