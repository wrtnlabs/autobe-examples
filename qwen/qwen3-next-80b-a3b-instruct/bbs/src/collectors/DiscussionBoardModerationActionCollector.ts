import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardModerationActionCollector {
  export async function collect(props: {
    body: IDiscussionBoardModerationAction.ICreate;
    discussionBoardModerators: IEntity;
    discussionBoardModeratorSessions: IEntity;
  }) {
    return {
      id: v4(),
      action_type: "CONTENT_REMOVAL",
      reason: "Moderation action logged",
      target_type: "ARTICLE",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      moderator: {
        connect: { id: props.discussionBoardModerators.id },
      },
      report: undefined,
      target: undefined,
      discussion_board_archives: undefined,
      discussion_board_comment_mod_actions: undefined,
      discussion_board_moderation_audit_trails: undefined,
      discussion_board_citizen_violations: undefined,
      discussion_board_notification_records: undefined,
    } satisfies Prisma.discussion_board_moderation_actionsCreateInput;
  }
}
