import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformKarmaDecay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaDecay";
export function prepare_random_reddit_platform_karma_decay(
  input?: DeepPartial<IRedditPlatformKarmaDecay.ICreate>,
): IRedditPlatformKarmaDecay.ICreate {
  return {
    decay_rate:
      input?.decay_rate ??
      typia.random<number & tags.Minimum<0.01> & tags.Maximum<100>>(),
    min_karma_threshold:
      input?.min_karma_threshold ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
      >(),
  };
}
