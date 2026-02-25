import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceReviewAtSummaryTransformer } from "./EcommerceReviewAtSummaryTransformer";

export namespace EcommerceReviewModerationActionTransformer {
  export type Payload = Prisma.ecommerce_review_moderation_actionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        status: true,
        additional_notes: true,
        created_at: true,
        updated_at: true,
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
        review: EcommerceReviewAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_review_moderation_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewModerationAction> {
    return {
      id: input.id,
      action_type: input.action_type,
      reason: input.reason,
      status: input.status,
      additional_notes: input.additional_notes ?? null,
      administrator: await EcommerceAdministratorAtSummaryTransformer.transform(
        input.administrator,
      ),
      review: await EcommerceReviewAtSummaryTransformer.transform(input.review),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
