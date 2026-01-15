import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
export function prepare_random_community_platform_moderation_action(
  input?: DeepPartial<ICommunityPlatformModerationAction.ICreate>,
): ICommunityPlatformModerationAction.ICreate {
  return {
    report_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: RandomGenerator.pick([
      "warn",
      "mute",
      "suspend",
      "ban",
      "remove_content",
    ] as const),
    notes:
      input?.notes ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      }),
  };
}
