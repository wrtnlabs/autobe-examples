import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewModerationLogTransformer {
  export type Payload = Prisma.shopping_mall_review_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        justification: true,
        created_at: true,
        review: true,
        moderator: true,
      },
    } satisfies Prisma.shopping_mall_review_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewModerationLog> {
    return {
      decision: input.action as "approved" | "rejected" | "flagged",
      reason: input.justification as
        | "spam"
        | "hate_speech"
        | "harassment"
        | "nudity"
        | "fraud"
        | "impersonation"
        | "copyright"
        | "other",
      comment: input.comment ?? undefined,
      created_by: input.moderator.id,
    };
  }
}
