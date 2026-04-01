import { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerApprovalSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_approval_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        from_status: true,
        to_status: true,
        actor_type: true,
        rejection_reason: true,
        created_at: true,
        approvalRequest: true,
        seller: true,
        actor: true,
      },
    } satisfies Prisma.ecommerce_mall_seller_approval_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApprovalSnapshot.ISummary> {
    return {
      id: input.id,
      from_status: input.from_status,
      to_status: input.to_status,
      actor_type: input.actor_type,
      actor_id: input.actor?.id ?? null,
      rejection_reason: input.rejection_reason ?? null,
      created_at: input.created_at.toISOString(),
      ecommerce_mall_seller_approval_request_id: input.approvalRequest.id,
      ecommerce_mall_seller_id: input.seller.id,
    };
  }
}
