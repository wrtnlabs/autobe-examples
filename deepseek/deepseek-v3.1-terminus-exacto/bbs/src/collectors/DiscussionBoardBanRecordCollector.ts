import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBanRecordCollector {
  export async function collect(props: {
    body: IDiscussionBoardBanRecord.ICreate;
  }) {
    const id: string = v4();
    const created_at: Date = new Date();
    // Calculate expires_at if ban_duration_days is provided
    const expires_at: Date | null = props.body.ban_duration_days
      ? new Date(
          created_at.getTime() +
            props.body.ban_duration_days * 24 * 60 * 60 * 1000,
        )
      : null;
    return {
      id,
      ban_reason: props.body.ban_reason,
      ban_duration_days: props.body.ban_duration_days ?? null,
      ban_status: props.body.ban_status,
      expires_at,
      revoked_at: null,
      revoked_reason: null,
      created_at,
      updated_at: created_at,
    } satisfies Prisma.discussion_board_ban_recordsCreateInput;
  }
}
