import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformOrderAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_number: true,
        status: true,
        total_amount: true,
        recipient_name: true,
        recipient_phone: true,
        street_address: true,
        city: true,
        state_province: true,
        postal_code: true,
        country: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        orderItems: true,
        shipments: true,
      },
    } satisfies Prisma.mall_platform_ordersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformOrder.ISummary> {
    return {
      id: input.id,
      orderNumber: input.order_number,
      status: input.status,
      totalAmount: Number(input.total_amount),
      createdAt: input.created_at.toISOString(),
    };
  }
}
