import { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdminsRequestCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdminsRequest.ICreate;
    member: IEntity;
  }) {
    return {
      id: v4(),
      reason: "",
      status: "pending",
      created_at: new Date(),
      approved_at: null,
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.member.id } },
      admin: undefined,
      superAdmin: undefined,
    } satisfies Prisma.discussion_board_admins_requestsCreateInput;
  }
}
