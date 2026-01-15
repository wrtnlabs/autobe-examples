import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformVote";
export function prepare_random_reddit_platform_vote(
  input?: DeepPartial<IRedditPlatformVote.ICreate> | undefined,
): IRedditPlatformVote.ICreate {
  return {};
}
