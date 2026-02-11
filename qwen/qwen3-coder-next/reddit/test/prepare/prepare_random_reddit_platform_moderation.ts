import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_moderation(
  input?: DeepPartial<IRedditPlatformModeration.ICreate> | undefined,
): IRedditPlatformModeration.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    role: input?.role ?? RandomGenerator.pick(["OWNER", "MODERATOR"] as const),
  };
}
