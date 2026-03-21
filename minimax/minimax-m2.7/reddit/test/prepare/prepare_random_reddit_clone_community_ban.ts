import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community_ban(
  input?: DeepPartial<IRedditCloneCommunityBan.ICreate>,
): IRedditCloneCommunityBan.ICreate {
  return {
    name: input?.name ?? RandomGenerator.alphabets(10),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
