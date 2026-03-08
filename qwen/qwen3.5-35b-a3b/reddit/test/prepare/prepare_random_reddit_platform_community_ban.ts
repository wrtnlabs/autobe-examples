import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_community_ban(
  input?: DeepPartial<IRedditPlatformCommunityBan.ICreate>,
): IRedditPlatformCommunityBan.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    expires_at:
      input?.expires_at ??
      (Math.random() > 0.5
        ? RandomGenerator.date(new Date(), 31 * 24 * 60 * 60 * 1000).toISOString()
        : null),
  };
}