import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaAward";
export function prepare_random_reddit_platform_karma_award(
  input?: DeepPartial<IRedditPlatformKarmaAward.ICreate>,
): IRedditPlatformKarmaAward.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 3,
      }),
    points: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>
    >(),
    grant_threshold: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>
    >(),
  };
}
