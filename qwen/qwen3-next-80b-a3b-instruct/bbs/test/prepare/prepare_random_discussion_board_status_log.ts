import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusLog";
import { IStatusLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IStatusLogMetadata";
export function prepare_random_discussion_board_status_log(
  input?: DeepPartial<IDiscussionBoardStatusLog.ICreate>,
): IDiscussionBoardStatusLog.ICreate {
  return {
    // Test-customizable field: status_type
    status_type:
      input?.status_type ??
      RandomGenerator.pick([
        "user_login",
        "article_published",
        "comment_deleted",
        "moderation_action",
        "security_alert",
        "account_suspended",
        "file_uploaded",
        "api_access_denied",
        "content_removal",
        "system_update",
      ] as const),
    // Auto-generated field: target_entity_id with UUID format
    target_entity_id:
      input?.target_entity_id ?? typia.random<string & tags.Format<"uuid">>(),
    // Handle metadata - empty object type IStatusLogMetadata
    metadata: input?.metadata
      ? input.metadata
      : {
          ip_address: RandomGenerator.alphabets(15),
          user_agent: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          moderator_id: typia.random<string & tags.Format<"uuid">>(),
          rule_violated: RandomGenerator.alphabets(8),
        },
    // Test-customizable field: details
    details:
      input?.details ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 4,
        wordMax: 8,
      }),
  };
}
