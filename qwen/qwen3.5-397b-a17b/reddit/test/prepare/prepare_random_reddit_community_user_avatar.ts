import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_user_avatar(
  input?: DeepPartial<IRedditCommunityUserAvatar.ICreate>,
): IRedditCommunityUserAvatar.ICreate {
  return {
    file: input?.file ?? typia.random<string & tags.Format<"uri">>(),
  };
}
