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
    discussionBoardMembers: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      submitted_at: new Date(),
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.discussionBoardMembers.id } },
      reviewingAdministrator: undefined,
    } satisfies Prisma.discussion_board_admin_requestsCreateInput;
  }
}
