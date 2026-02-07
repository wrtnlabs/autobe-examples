import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBanDurationCollector {
  export async function collect(props: {
    body: IDiscussionBoardBanDuration.ICreate;
  }) {
    const id: string = v4();
    return {
      // Primary key and direct mappings
      id,
      name: props.body.name,
      description: props.body.description,
      duration_hours: props.body.duration_hours,
      is_permanent: props.body.is_permanent,
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_ban_durationsCreateInput;
  }
}
