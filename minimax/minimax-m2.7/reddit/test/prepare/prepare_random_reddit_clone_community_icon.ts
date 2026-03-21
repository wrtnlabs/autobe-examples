import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community_icon(
  input?: DeepPartial<IRedditCloneCommunityIcon.ICreate>,
): IRedditCloneCommunityIcon.ICreate {
  return {
    iconFileId:
      input?.iconFileId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
