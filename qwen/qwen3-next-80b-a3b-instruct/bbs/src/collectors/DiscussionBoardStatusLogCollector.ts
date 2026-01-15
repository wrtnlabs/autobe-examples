import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusLog";
import { IStatusLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IStatusLogMetadata";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardStatusLogCollector {
  export async function collect(props: {
    body: IDiscussionBoardStatusLog.ICreate;
  }) {
    return {
      id: v4(),
      status_type: props.body.status_type,
      message: props.body.details,
      context: props.body.metadata ? JSON.stringify(props.body.metadata) : null,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.discussion_board_status_logsCreateInput;
  }
}
