import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_file(
  input?: DeepPartial<IRedditCommunityFile.ICreate>,
): IRedditCommunityFile.ICreate {
  return {
    file_type:
      input?.file_type ??
      RandomGenerator.pick(["avatar", "post", "community_icon"] as const),
    owner_id: input?.owner_id ?? typia.random<string & tags.Format<"uuid">>(),
    file_uri: input?.file_uri ?? typia.random<string & tags.Format<"url">>(),
  };
}
