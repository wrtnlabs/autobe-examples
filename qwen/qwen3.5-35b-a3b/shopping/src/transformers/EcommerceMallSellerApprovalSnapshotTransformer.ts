import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_approval_requestsFindManyArgs,
        seller: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        actor: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_approval_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApprovalSnapshot> {
    // Handle polymorphic actor reference based on actor_type discriminator
    // Note: The actor relation only points to ecommerce_mall_admins table
    // When actor_type is 'superAdmin', input.actor will be null
    let actor:
      | IEcommerceMallAdmin.ISummary
      | IEcommerceMallSuperAdmin.ISummary
      | null = null;
    if (input.actor_type === "admin" && input.actor) {
      actor = await EcommerceMallAdminAtSummaryTransformer.transform(
        input.actor,
      );
    }
    // For superAdmin type, actor remains null since there's no relation to super_admins table
    return {
      id: input.id,
      approvalRequestId: input.approvalRequest.id,
      sellerId: input.seller.id,
      actor,
      actorType: input.actor_type,
      fromStatus: input.from_status,
      toStatus: input.to_status,
      rejectionReason: input.rejection_reason ?? null,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
