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
    article: IEntity;
  }) {
    return {
      id: v4(),
      status: props.body.action_type,
      reason: props.body.actionReason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: {
        connect: { id: props.article.id },
      },
    } satisfies Prisma.discussion_board_moderation_actionsCreateInput;
  }
}
