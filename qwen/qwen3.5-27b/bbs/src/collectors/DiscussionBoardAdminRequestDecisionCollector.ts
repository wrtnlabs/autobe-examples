import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdminRequestDecisionCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdminRequestDecision.ICreate;
    discussionBoardAdminRequests: IEntity;
    discussionBoardAdministrators: IEntity;
  }) {
    return {
      id: v4(),
      decision_type: props.body.decision_type,
      decision_context: props.body.decision_context ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      adminRequest: { connect: { id: props.discussionBoardAdminRequests.id } },
      reviewer: { connect: { id: props.discussionBoardAdministrators.id } },
    } satisfies Prisma.discussion_board_admin_request_decisionsCreateInput;
  }
}
