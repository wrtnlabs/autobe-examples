import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdministratorRequestTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorRequest> {
    return {
      id: input.id,
      applicant_type: input.applicant_type,
      status: input.status,
      reason: input.reason,
      review_note: input.review_note,
      rejection_reason: input.rejection_reason,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      approved_at: input.approved_at?.toISOString() ?? null,
      rejected_at: input.rejected_at?.toISOString() ?? null,
      reviewedByAdministrator: input.reviewedByAdministrator
        ? await ShoppingMallAdministratorAtSummaryTransformer.transform(
            input.reviewedByAdministrator,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
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
        reviewedByAdministrator:
          ShoppingMallAdministratorAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_administrator_requestsFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_administrator_requestsGetPayload<
    ReturnType<typeof select>
  >;
}
