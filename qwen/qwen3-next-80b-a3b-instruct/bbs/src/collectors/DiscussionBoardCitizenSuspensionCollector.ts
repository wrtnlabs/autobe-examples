import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardCitizenSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenSuspension";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCitizenSuspensionCollector {
  export async function collect(props: {
    body: IDiscussionBoardCitizenSuspension.ICreate;
    discussionBoardModerator: IEntity;
    discussionBoardModeratorSessions: IEntity;
  }) {
    return {
      id: v4(),
      suspension_start: props.body.start_date,
      suspension_end: props.body.end_date ?? new Date(),
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      citizen: {
        connect: { id: props.body.citizen_id },
      },
    } satisfies Prisma.discussion_board_citizen_suspensionsCreateInput;
  }
}
