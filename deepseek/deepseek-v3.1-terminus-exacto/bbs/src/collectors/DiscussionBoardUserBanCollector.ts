import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardUserBanCollector {
  export async function collect(props: {
    body: IDiscussionBoardUserBan.ICreate;
    discussionBoardAdmins: IEntity;
  }) {
    const id: string = v4();
    const banStartedAt: Date = new Date();
    // Calculate ban end date based on duration type
    let banEndsAt: Date | null = null;
    if (
      props.body.ban_duration_type === "temporary" &&
      props.body.ban_duration_days
    ) {
      banEndsAt = new Date(
        banStartedAt.getTime() +
          props.body.ban_duration_days * 24 * 60 * 60 * 1000,
      );
    }
    return {
      // Scalar fields
      id,
      ban_reason: props.body.ban_reason,
      ban_duration_type: props.body.ban_duration_type,
      ban_duration_days: props.body.ban_duration_days ?? null,
      ban_started_at: banStartedAt,
      ban_ends_at: banEndsAt,
      ban_status: "active",
      appeal_status: "none",
      appeal_reason: null,
      appeal_reviewed_at: null,
      appeal_reviewer_id: null,
      appeal_decision_reason: null,
      revoked_at: null,
      revoked_by_id: null,
      revocation_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      bannedUser: { connect: { id: props.body.banned_user_id } },
      banningAdministrator: { connect: { id: props.discussionBoardAdmins.id } },
    } satisfies Prisma.discussion_board_user_bansCreateInput;
  }
}
