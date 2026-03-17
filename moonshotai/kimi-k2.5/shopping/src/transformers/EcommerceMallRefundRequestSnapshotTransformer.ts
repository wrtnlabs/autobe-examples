import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRefundRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_refund_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        refund_request_id: true,
        reason: true,
        status: true,
        response_reason: true,
        created_at: true,
        refundRequest: {
          select: {
            id: true,
            status: true,
            reason: true,
            requested_at: true,
            responded_at: true,
            order_item_id: true,
            orderItem: {
              select: {
                id: true,
                productSnapshot: {
                  select: {
                    name: true,
                  },
                },
              },
            } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
            customer: {
              select: {
                id: true,
              },
            } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
            seller: {
              select: {
                id: true,
                profileSnapshots: {
                  select: {
                    shop_name: true,
                  },
                  orderBy: {
                    created_at: "desc" as const,
                  },
                  take: 1,
                },
              },
            } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequestSnapshot> {
    const refundRequestSummary: IEcommerceMallRefundRequest.ISummary = {
      id: input.refundRequest.id,
      status: input.refundRequest.status,
      reason: input.refundRequest.reason,
      submittedAt: toISOStringSafe(input.refundRequest.requested_at),
      respondedAt: input.refundRequest.responded_at
        ? toISOStringSafe(input.refundRequest.responded_at)
        : null,
      hasResponse: input.refundRequest.responded_at !== null,
      orderItemId: input.refundRequest.orderItem.id,
      productName: input.refundRequest.orderItem.productSnapshot?.name ?? "",
      sellerShopName:
        input.refundRequest.seller.profileSnapshots[0]?.shop_name ?? "",
      customerDisplayName: "",
    };
    return {
      id: input.id,
      refundRequestId: input.refund_request_id,
      reason: input.reason,
      status: input.status,
      responseReason: input.response_reason,
      refundRequest: refundRequestSummary,
      createdAt: input.created_at.toISOString(),
    };
  }
}
