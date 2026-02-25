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
    discussionBoardAdmins: IEntity;
  }) {
    const id: string = v4();
    // Calculate expiration date for temporary bans
    const expiresAt =
      props.body.banDurationType === "temporary" && props.body.banDurationDays
        ? new Date(
            Date.now() + props.body.banDurationDays * 24 * 60 * 60 * 1000,
          )
        : null;
    return {
      id,
      ban_reason: props.body.banReason,
      ban_duration_days:
        props.body.banDurationType === "temporary"
          ? props.body.banDurationDays
          : null,
      ban_status: "active",
      expires_at: expiresAt,
      revoked_at: null,
      revoked_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.discussion_board_ban_recordsCreateInput;
  }
}
