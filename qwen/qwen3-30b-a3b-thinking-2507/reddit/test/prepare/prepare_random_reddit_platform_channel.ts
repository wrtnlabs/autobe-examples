import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformChannel";
export function prepare_random_reddit_platform_channel(
  input?: DeepPartial<IRedditPlatformChannel.ICreate>,
): IRedditPlatformChannel.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 8,
      }),
    code:
      input?.code ?? typia.random<string & tags.Pattern<"^[a-z0-9_]+$">>(),
  };
}