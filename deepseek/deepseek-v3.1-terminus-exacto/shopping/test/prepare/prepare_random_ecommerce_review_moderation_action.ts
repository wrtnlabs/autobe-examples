import { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_review_moderation_action(
  input?: DeepPartial<IEcommerceReviewModerationAction.ICreate> | undefined,
): IEcommerceReviewModerationAction.ICreate {
  return {
    action_type:
      input?.action_type ??
      RandomGenerator.pick([
        "remove_content",
        "adjust_rating",
        "suspend_review",
        "restore_review",
        "warning",
      ] as const),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "pending",
        "completed",
        "requires_followup",
        "cancelled",
      ] as const),
    additional_notes:
      input?.additional_notes !== undefined
        ? input.additional_notes
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
