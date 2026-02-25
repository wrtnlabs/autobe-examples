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
    discussionBoardUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      review_notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      reviewed_at: null,
      requester: { connect: { id: props.discussionBoardUsers.id } },
      reviewer: undefined,
    } satisfies Prisma.discussion_board_admin_requestsCreateInput;
  }
}
