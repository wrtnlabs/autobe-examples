import { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment_moderation(
  input?: DeepPartial<ICommunityPlatformCommentModeration.ICreate>,
): ICommunityPlatformCommentModeration.ICreate {
  return {
    action_type:
      input?.action_type ??
      RandomGenerator.pick([
        "delete",
        "approve",
        "ban_user",
        "remove_ban",
        "edit",
        "hide",
        "report",
      ] as const),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "active",
        "pending",
        "completed",
        "rejected",
      ] as const),
    duration_hours:
      input?.duration_hours === undefined
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()
        : input.duration_hours,
  };
}
