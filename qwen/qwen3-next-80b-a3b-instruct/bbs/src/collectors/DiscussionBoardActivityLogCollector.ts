import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import { IDiscussionBoardActivityLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLogMetadata";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardActivityLogCollector {
  export async function collect(props: {
    body: IDiscussionBoardActivityLog.ICreate;
    discussionBoardCitizen?: IEntity; // from authorized actor
    discussionBoardModerator?: IEntity; // from authorized actor
    discussionBoardCitizenSessions?: IEntity; // from authorized session
    discussionBoardModeratorSessions?: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      action_type: props.body.action_type,
      context: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      citizen: props.discussionBoardCitizen
        ? { connect: { id: props.discussionBoardCitizen.id } }
        : undefined,
      moderator: props.discussionBoardModerator
        ? { connect: { id: props.discussionBoardModerator.id } }
        : undefined,
    } satisfies Prisma.discussion_board_activity_logsCreateInput;
  }
}
