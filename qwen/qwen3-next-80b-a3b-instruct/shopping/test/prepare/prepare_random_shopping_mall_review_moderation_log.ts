import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";
export function prepare_random_shopping_mall_review_moderation_log(
  input?: DeepPartial<IShoppingMallReviewModerationLog.ICreate> | undefined,
): IShoppingMallReviewModerationLog.ICreate {
  return {
    decision:
      input?.decision ??
      RandomGenerator.pick([
        "approved",
        "rejected",
        "flagged",
        "removed",
      ] as const),
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "fraud",
        "spam",
        "hate_speech",
        "nudity",
        "harassment",
        "impersonation",
        "copyright",
        "other",
      ] as const),
    comment:
      input?.comment ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
