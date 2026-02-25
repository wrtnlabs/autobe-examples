import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_audit_log(
  input?: DeepPartial<IDiscussionBoardAuditLog.ICreate>,
): IDiscussionBoardAuditLog.ICreate {
  return {
    event_type:
      input?.event_type ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 7 }),
    event_description:
      input?.event_description ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 15 }),
    actor_id: input?.actor_id ?? null,
  };
}
