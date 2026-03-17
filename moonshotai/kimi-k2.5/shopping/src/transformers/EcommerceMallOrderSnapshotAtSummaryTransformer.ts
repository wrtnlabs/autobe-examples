import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallOrderSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        order: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_order_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderSnapshot.ISummary> {
    return {
      id: input.id,
      orderId: input.order.id,
      createdAt: input.created_at.toISOString(),
    };
  }
}
