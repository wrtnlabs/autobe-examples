import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_ban(
  input?: DeepPartial<IRedditPlatformBan.ICreate> | undefined,
): IRedditPlatformBan.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    expired_at:
      input?.expired_at ??
      (Math.random() < 0.5
        ? null
        : RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 365,
          ).toISOString()),
  };
}
