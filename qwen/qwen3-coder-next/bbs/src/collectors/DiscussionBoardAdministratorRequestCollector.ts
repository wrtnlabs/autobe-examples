import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorRequestCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorRequest.ICreate;
    member: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: props.body.status,
      submitted_at: new Date(),
      processed_at: null,
      rejection_reason: null,
      submitter: { connect: { id: props.member.id } },
      processor: undefined,
    } satisfies Prisma.discussion_board_administrator_requestsCreateInput;
  }
}
