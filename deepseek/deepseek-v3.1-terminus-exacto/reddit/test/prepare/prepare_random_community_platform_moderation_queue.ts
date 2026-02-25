import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_moderation_queue(
  input?: DeepPartial<ICommunityPlatformModerationQueue.ICreate> | undefined,
): ICommunityPlatformModerationQueue.ICreate {
  return {
    status:
      input?.status ??
      RandomGenerator.pick([
        "pending",
        "assigned",
        "in-review",
        "completed",
        "rejected",
      ] as const),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "normal", "high", "critical"] as const),
    community_platform_post_id:
      input?.community_platform_post_id ??
      typia.random<string & tags.Format<"uuid">>(),
    community_platform_comment_id:
      input?.community_platform_comment_id ??
      typia.random<string & tags.Format<"uuid">>(),
    resolution:
      input?.resolution ??
      RandomGenerator.pick([
        null,
        "approved",
        "removed",
        "warned",
        "banned",
      ] as const),
    resolution_reason:
      input?.resolution_reason ??
      RandomGenerator.pick([
        null,
        RandomGenerator.paragraph({ sentences: 2 }),
      ] as const),
  };
}
