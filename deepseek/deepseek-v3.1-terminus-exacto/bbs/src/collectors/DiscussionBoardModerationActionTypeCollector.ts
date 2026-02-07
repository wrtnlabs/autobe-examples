import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardModerationActionTypeCollector {
  export async function collect(props: {
    body: IDiscussionBoardModerationActionType.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description,
      category: props.body.category ?? null,
      severity_level: props.body.severity_level ?? null,
      requires_reason: props.body.requires_reason,
      is_active: props.body.is_active,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.discussion_board_moderation_action_typesCreateInput;
  }
}
