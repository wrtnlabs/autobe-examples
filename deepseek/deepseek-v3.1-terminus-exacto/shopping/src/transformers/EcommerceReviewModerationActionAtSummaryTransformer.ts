import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";

export namespace EcommerceReviewModerationActionAtSummaryTransformer {
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
        review: {
          select: { id: true },
        } satisfies Prisma.ecommerce_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_review_moderation_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceReviewModerationAction.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      status: input.status,
      administrator: await EcommerceAdministratorAtSummaryTransformer.transform(
        input.administrator,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
