import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardHealthCheckCollector {
  export async function collect(props: {
    body: IDiscussionBoardHealthCheck.ICreate;
  }) {
    const id = v4();
    return {
      id,
      status: props.body.status,
      checked_at: new Date(props.body.checkedAt),
      details: props.body.details ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_health_checksCreateInput;
  }
}
