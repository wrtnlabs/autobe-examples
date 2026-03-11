import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorAssignmentCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorAssignment.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      old_role: props.body.old_role,
      new_role: props.body.new_role,
      assignment_type: props.body.assignment_type,
      reason: props.body.reason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_administrator_assignmentsCreateInput;
  }
}
