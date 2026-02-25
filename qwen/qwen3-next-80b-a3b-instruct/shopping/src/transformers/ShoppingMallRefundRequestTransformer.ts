import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallRefundRequestSnapshotTransformer } from "./ShoppingMallRefundRequestSnapshotTransformer";

export namespace ShoppingMallRefundRequestTransformer {
  export type Payload = Prisma.shopping_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        response_reason: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        customer: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
        responder: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
        snapshots: ShoppingMallRefundRequestSnapshotTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequest> {
    return {
      id: input.id,
      order_item_id: input.orderItem.id,
      customer_id: input.customer.id,
      responder_id: input.responder ? input.responder.id : undefined,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      response_reason: input.response_reason ?? undefined,
      responded_at: input.responded_at
        ? toISOStringSafe(input.responded_at)
        : undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        ShoppingMallRefundRequestSnapshotTransformer.transform,
      ),
    };
  }
}
