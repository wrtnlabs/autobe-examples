import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallRefundRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        requested_at: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            status: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        customer: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        snapshots: {
          select: {
            id: true,
            refund_request_id: true,
            reason: true,
            status: true,
            response_reason: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "rejected",
      orderItem: {
        id: input.orderItem.id,
        status: input.orderItem.status,
      } as IEcommerceMallOrderItem & {
        id: string & tags.Format<"uuid">;
      },
      customer: {
        id: input.customer.id,
        customerId: input.customer.id,
        displayName: null,
        phoneNumber: null,
        createdAt: toISOStringSafe(input.customer.created_at),
        updatedAt: toISOStringSafe(input.customer.updated_at),
      } satisfies IEcommerceMallCustomer,
      seller: {
        shopName: null,
        shopDescription: null,
        logoImageUrl: null,
        createdAt: toISOStringSafe(input.seller.created_at),
      } satisfies IEcommerceMallSeller,
      requestedAt: toISOStringSafe(input.requested_at),
      respondedAt: input.responded_at
        ? toISOStringSafe(input.responded_at)
        : null,
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        async (snapshot): Promise<IEcommerceMallRefundRequestSnapshot> => ({
          id: snapshot.id,
          refundRequestId: snapshot.refund_request_id,
          reason: snapshot.reason,
          status: snapshot.status,
          responseReason: snapshot.response_reason,
          refundRequest: {
            id: input.id,
            status: input.status,
            reason: input.reason,
            submittedAt: toISOStringSafe(input.requested_at),
            respondedAt: input.responded_at
              ? toISOStringSafe(input.responded_at)
              : null,
            hasResponse: input.responded_at !== null,
            orderItemId: input.orderItem.id,
            productName: "",
            sellerShopName: "",
            customerDisplayName: "",
          },
          createdAt: toISOStringSafe(snapshot.created_at),
        }),
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
