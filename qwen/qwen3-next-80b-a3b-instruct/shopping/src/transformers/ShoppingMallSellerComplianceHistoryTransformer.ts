import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerComplianceHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerComplianceHistory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerComplianceHistoryTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_compliance_historyGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        actor_id: true,
        violation_type: true,
        description: true,
        severity: true,
        action_taken: true,
        evidence_reference: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: true,
      },
    } satisfies Prisma.shopping_mall_seller_compliance_historyFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerComplianceHistory> {
    return {
      event_type: input.violation_type,
      status: input.action_taken,
      reason: input.description,
      created_at: input.created_at.toISOString(),
    };
  }
}
