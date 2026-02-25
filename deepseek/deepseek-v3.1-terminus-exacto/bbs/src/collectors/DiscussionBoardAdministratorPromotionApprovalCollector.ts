import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorPromotionApprovalCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorPromotionApproval.ICreate;
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      approved_at: null,
      rejected_at: null,
      reviewer_discussion_board_super_admin_id: undefined,
      reviewer_notes: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      user: { connect: { id: props.user.id } },
      administrator: undefined,
    } satisfies Prisma.discussion_board_administrator_promotion_requestsCreateInput;
  }
}
