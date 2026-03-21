import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_moderator_snapshot(
  input?: DeepPartial<IRedditCloneModeratorSnapshot.ICreate>,
): IRedditCloneModeratorSnapshot.ICreate {
  return {
    memberUsername: input?.memberUsername ?? RandomGenerator.alphabets(10),
  };
}
