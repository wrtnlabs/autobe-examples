import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorPromotionRequestCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorPromotionRequest.ICreate;
    discussionBoardUsers: IEntity;
    discussionBoardUserSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "pending",
      approved_at: null,
      rejected_at: null,
      reviewer_discussion_board_super_admin_id: null,
      reviewer_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      user: { connect: { id: props.discussionBoardUsers.id } },
      administrator: undefined,
      // Remove non-existent properties from Prisma type
    } satisfies Prisma.discussion_board_administrator_promotion_requestsCreateInput;
  }
}
