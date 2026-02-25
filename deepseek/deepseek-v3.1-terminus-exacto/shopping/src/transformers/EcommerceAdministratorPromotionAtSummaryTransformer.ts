import { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceAdministratorPromotionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_administrator_promotionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        request_reason: true,
        status: true,
        approval_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        approved_at: true,
        rejected_at: true,
        requestingUser: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_customersFindManyArgs,
        approvingSuperAdministrator: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_super_administratorsFindManyArgs,
        promotionRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_administrator_promotion_requestsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_administrator_promotionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdministratorPromotion.ISummary> {
    return {
      id: input.id,
      request_reason: input.request_reason,
      status: input.status,
      approval_reason: input.approval_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      approved_at: input.approved_at?.toISOString() ?? undefined,
      rejected_at: input.rejected_at?.toISOString() ?? undefined,
      requesting_user_id: input.requestingUser.id,
      approving_super_administrator_id:
        input.approvingSuperAdministrator?.id ?? undefined,
    };
  }
}
