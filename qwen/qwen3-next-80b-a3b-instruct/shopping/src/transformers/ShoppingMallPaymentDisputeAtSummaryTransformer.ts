import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentDisputeAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_payment_disputesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        dispute_status: true,
        dispute_reason: true,
        dispute_description: true,
        created_at: true,
        updated_at: true,
        evidence_url: true,
        resolution_notes: true,
        deleted_at: true,
        payment: {
          select: {
            id: true,
            amount: true,
          },
        },
        customer: {
          select: {
            id: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
        assignee: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_disputesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentDispute.ISummary> {
    return {
      id: input.id,
      payment_id: input.payment.id,
      customer_id: input.customer.id,
      dispute_type: input.dispute_reason,
      status: input.dispute_status,
      resolution_status: input.dispute_status, // Fixed: Use dispute_status as resolution_status fallback
      amount: Number(input.payment.amount),
      disputed_at: input.created_at.toISOString(),
      resolved_at: input.updated_at.toISOString(),
      comments: input.dispute_description,
    };
  }
}
