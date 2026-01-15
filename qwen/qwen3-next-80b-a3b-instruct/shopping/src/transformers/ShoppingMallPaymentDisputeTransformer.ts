import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";
import { IShoppingMallPaymentDisputeEvidence } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDisputeEvidence";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentDisputeTransformer {
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
        evidence_url: true,
        resolution_notes: true,
        payment: true,
        customer: true,
        seller: true,
        assignee: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_disputesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentDispute> {
    return {
      payment_id: input.payment.id,
      dispute_type: input.dispute_status,
      status: input.dispute_status,
      reason: input.dispute_reason || input.dispute_description || "",
      resolution_notes: input.resolution_notes ?? undefined,
      supporting_evidence: input.evidence_url ? [input.evidence_url] : [],
      user_id: input.customer.id,
      created_at: input.created_at.toISOString(),
    };
  }
}
