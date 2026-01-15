import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAppealCollector {
  export async function collect(props: {
    body: IDiscussionBoardAppeal.ICreate;
    discussionBoardCitizen: IEntity;
    discussionBoardCitizenSessions: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.justification,
      resolution: null,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: {
        connect: { id: props.discussionBoardCitizen.id },
      },
      target: {
        connect: { id: props.body.moderation_action_id },
      },
      moderator: undefined,
      discussion_board_notification_records: undefined,
    } satisfies Prisma.discussion_board_appealsCreateInput;
  }
}
