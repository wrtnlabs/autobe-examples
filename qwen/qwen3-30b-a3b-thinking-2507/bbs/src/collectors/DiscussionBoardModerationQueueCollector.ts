import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardModerationQueueCollector {
  export async function collect(props: {
    body: IDiscussionBoardModerationQueue.ICreate;
    discussionBoardAdmins: IEntity;
    discussionBoardAdminSessions: IEntity;
  }) {
    return {
      id: v4(),
      status: "pending",
      reason: null,
      submitted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.body.articleId } },
      submitter: { connect: { id: props.discussionBoardAdmins.id } },
    } satisfies Prisma.discussion_board_moderation_queueCreateInput;
  }
}
