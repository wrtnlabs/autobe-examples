import { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBansAppealCollector {
  export async function collect(props: {
    body: IDiscussionBoardBansAppeal.ICreate;
    banRecord: IEntity;
  }) {
    // Query ban record to get user_id and appeal details
    const ban =
      await MyGlobal.prisma.discussion_board_bans_ban_records.findFirstOrThrow({
        where: { id: props.banRecord.id },
      });
    return {
      id: v4(),
      appeal_reason: "Appeal against ban",
      status: "pending",
      review_notes: null,
      appeal_created_at: new Date(),
      reviewed_at: null,
      banRecord: { connect: { id: ban.id } },
      user: { connect: { id: ban.user_id } },
      reviewedBy: undefined,
    } satisfies Prisma.discussion_board_bans_appealsCreateInput;
  }
}
