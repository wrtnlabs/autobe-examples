import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
export function prepare_random_community_platform_moderation_log(
  input?: DeepPartial<ICommunityPlatformModerationLog.ICreate>,
): ICommunityPlatformModerationLog.ICreate {
  return {
    content_id:
      input?.content_id ?? typia.random<string & tags.Format<"uuid">>(),
    reporter_id:
      input?.reporter_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    action_status:
      input?.action_status ??
      RandomGenerator.pick([
        "pending",
        "accepted",
        "rejected",
        "dismissed",
      ] as const),
    notes:
      input?.notes ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        sentenceMin: 8,
        sentenceMax: 15,
      }),
  };
}
