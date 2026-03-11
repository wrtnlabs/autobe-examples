import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_community_ban(
  input?: DeepPartial<IRedditPlatformCommunityBan.ICreate> | undefined,
): IRedditPlatformCommunityBan.ICreate {
  return {
    userId: input?.userId ?? typia.random<string & tags.Format<"uuid">>(),
    expiresAt:
      input?.expiresAt ??
      (typia.random<number>() > 0.5
        ? null
        : RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 90,
          ).toISOString()),
  };
}