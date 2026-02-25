import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report_category(
  input?: DeepPartial<ICommunityPlatformReportCategory.ICreate>,
): ICommunityPlatformReportCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.alphabets(10),
    display_name:
      input?.display_name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 1, wordMax: 3 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    severity_level:
      input?.severity_level ??
      RandomGenerator.pick(["low", "medium", "high", "critical"] as const),
    moderation_guidelines:
      input?.moderation_guidelines ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    is_active: input?.is_active ?? typia.random<boolean>(),
  };
}
