import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerApprovalTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_approvalsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        reviewedByAdmin: EcommerceMallAdminAtSummaryTransformer.select(),
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_mall_seller_approvalsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerApproval> {
    return {
      id: input.id,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      reviewedByAdmin: input.reviewedByAdmin
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.reviewedByAdmin,
          )
        : null,
      status: input.status,
      rejectionReason: input.rejection_reason ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
