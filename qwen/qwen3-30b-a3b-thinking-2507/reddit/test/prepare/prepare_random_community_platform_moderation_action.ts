import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_moderation_action(
  input?: DeepPartial<ICommunityPlatformModerationAction.ICreate> | undefined,
): ICommunityPlatformModerationAction.ICreate {
  return {
    actionType:
      input?.actionType ??
      RandomGenerator.pick(["ban", "delete_post", "delete_comment"] as const),
    duration:
      input?.actionType === "ban"
        ? (input?.duration ??
          typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>())
        : undefined,
    targetId:
      input?.actionType === "delete_post" ||
      input?.actionType === "delete_comment"
        ? (input?.targetId ?? typia.random<string & tags.Format<"uuid">>())
        : undefined,
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 3,
        sentenceMax: 10,
      }),
    communityId: typia.random<string & tags.Format<"uuid">>(),
  };
}
