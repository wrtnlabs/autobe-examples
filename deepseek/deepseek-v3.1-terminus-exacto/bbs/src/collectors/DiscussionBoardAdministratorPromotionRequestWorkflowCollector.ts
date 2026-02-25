import { IDiscussionBoardAdministratorPromotionRequestWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequestWorkflow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorPromotionRequestWorkflowCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate;
    discussionBoardAdministratorPromotionRequests: IEntity; // from path parameter requestId
    discussionBoardSuperAdmins: IEntity; // from authorized actor
    discussionBoardSuperAdminSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      status: props.body.status,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      promotionRequest: {
        connect: { id: props.discussionBoardAdministratorPromotionRequests.id },
      },
    } satisfies Prisma.discussion_board_promotion_request_workflowsCreateInput;
  }
}
