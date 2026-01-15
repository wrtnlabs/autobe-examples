import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardWarningCollector {
  export async function collect(props: {
    body: IDiscussionBoardWarning.ICreate;
    citizen: IEntity;
  }) {
    return {
      id: v4(),
      warning_count: 1,
      severity: props.body.severity,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      citizen: {
        connect: { id: props.citizen.id },
      },
    } satisfies Prisma.discussion_board_warningsCreateInput;
  }
}
