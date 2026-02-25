import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorCapabilityCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorCapability.ICreate;
    discussionBoardAdministrators: IEntity; // from path parameter administratorId
    discussionBoardSuperAdmins: IEntity; // from authorized actor
    discussionBoardSuperAdminSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      capability_type: props.body.capability_type,
      permission_level: props.body.permission_level,
      assigned_by: props.discussionBoardSuperAdmins.id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      administrator: {
        connect: { id: props.discussionBoardAdministrators.id },
      },
    } satisfies Prisma.discussion_board_administrator_capabilitiesCreateInput;
  }
}
