import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberNotificationPreferencesPreferenceId(props: {
  member: MemberPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Attempt to delete the preference, verifying ownership in the same operation
  const deleted =
    await MyGlobal.prisma.discussion_board_notification_preferences.deleteMany({
      where: {
        id: props.preferenceId,
        discussion_board_member_id: props.member.id,
      },
    });

  // If no rows were deleted, the preference either doesn't exist or doesn't belong to the member
  if (deleted.count === 0) {
    throw new HttpException(
      "Notification preference not found or access denied",
      404,
    );
  }
}
