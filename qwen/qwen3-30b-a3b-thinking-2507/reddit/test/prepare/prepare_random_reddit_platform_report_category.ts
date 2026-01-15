import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportCategory";
export function prepare_random_reddit_platform_report_category(
  input?: DeepPartial<IRedditPlatformReportCategory.ICreate> | undefined,
): IRedditPlatformReportCategory.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.pick([
        "Spam",
        "Offensive Content",
        "Inappropriate Behavior",
        "Harassment",
        "Hate Speech",
        "Scams",
        "Copyright Infringement",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
