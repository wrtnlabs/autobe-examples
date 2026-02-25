import { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardAdminHierarchyActionAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_admin_hierarchy_actionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        created_at: true,
        actor: DiscussionBoardUserAtSummaryTransformer.select(),
        target: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_hierarchy_actionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminHierarchyAction.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type as "PROMOTION" | "DEMOTION",
      reason: input.reason,
      actor: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.actor,
      ),
      target: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.target,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
