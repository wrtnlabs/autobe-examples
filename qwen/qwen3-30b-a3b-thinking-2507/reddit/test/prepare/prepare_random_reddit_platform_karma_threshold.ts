import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformKarmaThreshold } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaThreshold";
export function prepare_random_reddit_platform_karma_threshold(
  input?: DeepPartial<IRedditPlatformKarmaThreshold.ICreate>,
): IRedditPlatformKarmaThreshold.ICreate {
  return {
    threshold_value:
      input?.threshold_value ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100000>
      >(),
    threshold_name: input?.threshold_name ?? RandomGenerator.name(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        sentenceMin: 5,
        sentenceMax: 10,
      }),
  };
}
