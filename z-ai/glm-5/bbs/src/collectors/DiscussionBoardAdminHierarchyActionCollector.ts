import { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdminHierarchyActionCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdminHierarchyAction.ICreate;
    actor: IEntity;
    target: IEntity;
    actionType: "PROMOTION" | "DEMOTION";
  }) {
    return {
      id: v4(),
      action_type: props.actionType,
      reason: props.body.reason ?? null,
      created_at: new Date(),
      actor: { connect: { id: props.actor.id } },
      target: { connect: { id: props.target.id } },
    } satisfies Prisma.discussion_board_admin_hierarchy_actionsCreateInput;
  }
}
