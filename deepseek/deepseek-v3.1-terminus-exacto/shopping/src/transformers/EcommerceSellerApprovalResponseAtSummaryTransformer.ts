import { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSellerApprovalResponseAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_seller_approval_responsesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        decision: true,
        reason: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        sellerApprovalQueue: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_seller_approval_queuesFindManyArgs,
        administrator: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_administratorsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_seller_approval_responsesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSellerApprovalResponse.ISummary> {
    return {
      id: input.id,
      decision: input.decision,
      reason: input.reason ?? null,
      responded_at: input.responded_at.toISOString(),
      administrator_id: input.administrator.id,
      seller_approval_queue_id: input.sellerApprovalQueue.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
