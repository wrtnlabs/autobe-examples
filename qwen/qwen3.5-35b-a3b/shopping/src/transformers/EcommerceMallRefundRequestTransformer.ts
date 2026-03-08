import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderItemAtSummaryTransformer } from "./EcommerceMallOrderItemAtSummaryTransformer";

export namespace EcommerceMallRefundRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        request_status: true,
        time_limit: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        statusSnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_snapshot_auditsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest> {
    return {
      id: input.id,
      order_item: await EcommerceMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      reason: input.reason,
      request_status: typia.assert<"pending" | "approved" | "rejected">(
        input.request_status,
      ),
      time_limit: toISOStringSafe(input.time_limit ?? new Date()),
      created_at: toISOStringSafe(input.created_at ?? new Date()),
      updated_at: toISOStringSafe(input.updated_at ?? new Date()),
    };
  }
}
