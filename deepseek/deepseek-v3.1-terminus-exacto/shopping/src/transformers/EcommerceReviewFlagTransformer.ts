import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceReviewAtSummaryTransformer } from "./EcommerceReviewAtSummaryTransformer";

export namespace EcommerceReviewFlagTransformer {
  export type Payload = Prisma.ecommerce_review_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        resolution_action: true,
        resolution_details: true,
        created_at: true,
        updated_at: true,
        assigned_at: true,
        resolved_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        review: EcommerceReviewAtSummaryTransformer.select(),
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_review_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewFlag> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      resolution_action: input.resolution_action ?? undefined,
      resolution_details: input.resolution_details ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      assigned_at: input.assigned_at?.toISOString() ?? null,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      review: await EcommerceReviewAtSummaryTransformer.transform(input.review),
      administrator: input.administrator
        ? await EcommerceAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : null,
    };
  }
}
