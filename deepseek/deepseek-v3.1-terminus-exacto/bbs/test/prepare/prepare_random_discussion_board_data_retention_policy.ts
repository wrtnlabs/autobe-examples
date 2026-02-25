import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_data_retention_policy(
  input?: DeepPartial<IDiscussionBoardDataRetentionPolicy.ICreate> | undefined,
): IDiscussionBoardDataRetentionPolicy.ICreate {
  return {
    policy_name:
      input?.policy_name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 5 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    retention_period_days:
      input?.retention_period_days ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    retention_action:
      input?.retention_action ??
      RandomGenerator.pick(["delete", "archive", "anonymize"] as const),
    compliance_standard:
      input?.compliance_standard ??
      RandomGenerator.pick(["GDPR", "CCPA", "HIPAA", "SOX", null] as const),
    is_active: input?.is_active ?? typia.random<boolean>(),
  };
}
