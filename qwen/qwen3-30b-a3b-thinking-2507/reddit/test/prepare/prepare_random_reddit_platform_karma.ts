import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarma";
export function prepare_random_reddit_platform_karma(
  input?: DeepPartial<IRedditPlatformKarma.ICreate>,
): IRedditPlatformKarma.ICreate {
  return {
    amount: input?.amount ?? typia.random<number & tags.Minimum<0>>(),
  };
}
