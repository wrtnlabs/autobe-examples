import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallRefundRequestAtSummaryTransformer } from "./ShoppingMallRefundRequestAtSummaryTransformer";

export namespace ShoppingMallRefundSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_refund_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_data: true,
        created_at: true,
        refundRequest: ShoppingMallRefundRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_refund_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundSnapshot> {
    return {
      id: input.id,
      snapshot_data: input.snapshot_data,
      created_at: input.created_at.toISOString(),
      refundRequest:
        await ShoppingMallRefundRequestAtSummaryTransformer.transform(
          input.refundRequest,
        ),
    };
  }
}
