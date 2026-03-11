import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_admin_request_decision(
  input?: DeepPartial<IDiscussionBoardAdminRequestDecision.ICreate> | undefined,
): IDiscussionBoardAdminRequestDecision.ICreate {
  const decision =
    input?.decision ?? RandomGenerator.pick(["approved", "rejected"] as const);
  return {
    admin_request_id:
      input?.admin_request_id ?? typia.random<string & tags.Format<"uuid">>(),
    decision,
    rejection_reason:
      decision === "rejected"
        ? (input?.rejection_reason ??
          RandomGenerator.paragraph({ sentences: 2 }))
        : (input?.rejection_reason ?? null),
  };
}
