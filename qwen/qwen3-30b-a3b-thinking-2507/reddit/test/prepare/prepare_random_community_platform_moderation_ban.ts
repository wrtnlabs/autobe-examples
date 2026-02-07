import { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_moderation_ban(
  input?: DeepPartial<ICommunityPlatformModerationBan.ICreate>,
): ICommunityPlatformModerationBan.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    moderator_id:
      input?.moderator_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.content({ paragraphs: 1, wordMin: 20, wordMax: 50 }),
    duration:
      input?.duration ??
      RandomGenerator.pick([
        "1 day",
        "7 days",
        "14 days",
        "30 days",
        "permanent",
      ]),
  };
}
