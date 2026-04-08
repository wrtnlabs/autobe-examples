import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdminAtSummaryTransformer } from "./EcommerceAdminAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceSellerApprovalTransformer {
  export type Payload = Prisma.ecommerce_seller_approvalsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
        reviewingAdmin: EcommerceAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_seller_approvalsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSellerApproval> {
    return {
      id: input.id,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      reviewedByAdmin: input.reviewingAdmin
        ? await EcommerceAdminAtSummaryTransformer.transform(
            input.reviewingAdmin,
          )
        : null,
      status: input.status,
      rejectionReason: input.rejection_reason ?? null,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceSellerApproval;
  }
}
