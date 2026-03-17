import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallAdminPromotionRequestTransformer {
  export type Payload =
    Prisma.ecommerce_mall_admin_promotion_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        customerSubtype: {
          select: {
            customer: EcommerceMallCustomerAtSummaryTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_customersFindManyArgs,
        sellerRequest: {
          select: {
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
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_request_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotionRequest> {
    // Handle polymorphic requester
    let requester:
      | IEcommerceMallCustomer.ISummary
      | IEcommerceMallSeller.ISummary;
    if (input.customerSubtype) {
      requester = await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customerSubtype.customer,
      );
    } else if (input.sellerRequest?.seller) {
      const seller = input.sellerRequest.seller;
      requester = {
        id: seller.id,
        email: seller.email,
        shopName: "", // No profile data available in this context
        approvalStatus: seller.approval_status,
        createdAt: seller.created_at.toISOString(),
        updatedAt: seller.updated_at.toISOString(),
        deletedAt: seller.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallSeller.ISummary;
    } else {
      throw new Error(
        "Invalid promotion request: neither customer nor seller requester found",
      );
    }
    return {
      id: input.id,
      status: input.status,
      reason: input.reason,
      rejectionReason: input.rejection_reason ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      reviewer: input.reviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(input.reviewer)
        : null,
      requester,
    };
  }
}
