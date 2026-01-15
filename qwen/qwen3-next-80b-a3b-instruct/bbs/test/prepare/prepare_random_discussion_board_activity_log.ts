import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import { IDiscussionBoardActivityLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLogMetadata";
export function prepare_random_discussion_board_activity_log(
  input?: DeepPartial<IDiscussionBoardActivityLog.ICreate>,
): IDiscussionBoardActivityLog.ICreate {
  return {
    action_type:
      input?.action_type ??
      RandomGenerator.pick([
        "article_created",
        "article_published",
        "article_deleted",
        "article_reported",
        "comment_created",
        "comment_reported",
        "comment_deleted",
        "moderation_action",
        "login",
        "logout",
        "account_suspended",
        "account_banned",
        "session_created",
        "system_maintenance",
        "configuration_changed",
      ] as const),
    target_type:
      input?.target_type ??
      RandomGenerator.pick([
        "article",
        "comment",
        "user",
        "moderator",
        "system",
      ] as const),
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    metadata: JSON.stringify(
      input?.metadata ?? {
        reason_code: RandomGenerator.pick([
          "spam",
          "inappropriate",
          "harassment",
          "trolling",
          "false_information",
          "other",
        ] as const),
        status_before: RandomGenerator.pick([
          "active",
          "pending",
          "hidden",
          "deleted",
        ] as const),
        status_after: RandomGenerator.pick([
          "deleted",
          "hidden",
          "resolved",
          "unresolved",
        ] as const),
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
        user_agent: RandomGenerator.alphaNumeric(20),
      },
    ),
  };
}
