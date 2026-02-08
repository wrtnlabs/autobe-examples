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
    registeredUser: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: "", // Default empty string since DTO has no reason
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      registeredUser: { connect: { id: props.registeredUser.id } },
    } satisfies Prisma.discussion_board_administrator_requestsCreateInput;
  }
}
