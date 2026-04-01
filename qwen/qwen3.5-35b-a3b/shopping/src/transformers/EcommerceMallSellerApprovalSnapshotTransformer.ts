import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";

export namespace EcommerceMallSellerApprovalSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_approval_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        from_status: true,
        to_status: true,
        rejection_reason: true,
        created_at: true,
        approvalRequest: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_seller_approval_requestsFindManyArgs,
        seller: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        actor: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_approval_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApprovalSnapshot> {
    return {
      id: input.id,
      approvalRequestId: input.approvalRequest.id,
      sellerId: input.seller.id,
      actor: input.actor
        ? await EcommerceMallAdminAtSummaryTransformer.transform(input.actor)
        : null,
      actorType: input.actor_type,
      fromStatus: input.from_status,
      toStatus: input.to_status,
      rejectionReason: input.rejection_reason ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
