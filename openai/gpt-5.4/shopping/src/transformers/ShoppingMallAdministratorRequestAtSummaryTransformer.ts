import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdministratorRequestAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorRequest.ISummary> {
    return {
      id: input.id,
      applicantType: input.applicant_type,
      status: input.status,
      reason: input.reason,
      reviewNote: input.review_note,
      rejectionReason: input.rejection_reason,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      approvedAt: input.approved_at?.toISOString() ?? null,
      rejectedAt: input.rejected_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      reviewer: input.reviewedByAdministrator
        ? await ShoppingMallAdministratorAtSummaryTransformer.transform(
            input.reviewedByAdministrator,
          )
        : null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        applicant_type: true,
        status: true,
        reason: true,
        review_note: true,
        rejection_reason: true,
        reviewed_at: true,
        approved_at: true,
        rejected_at: true,
        created_at: true,
        reviewedByAdministrator:
          ShoppingMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administrator_requestsFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_administrator_requestsGetPayload<
    ReturnType<typeof select>
  >;
}
