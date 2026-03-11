import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdminRequestCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdminRequest.ICreate;
    discussionBoardMembers: IEntity; // from authorized actor
    discussionBoardMemberSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      member: { connect: { id: props.discussionBoardMembers.id } },
      // Optional relations - not used in creation
      decision: undefined,
      administrativeHistories: undefined,
    } satisfies Prisma.discussion_board_admin_requestsCreateInput;
  }
}
