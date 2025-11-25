import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicDiscussionModeratorMembersMemberId(props: {
  moderator: ModeratorPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify moderator exists (already auth'd via decorator but double-check for safety)
  const moderator =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { id: props.moderator.id },
    });

  if (!moderator) {
    throw new HttpException("Moderator account not found", 403);
  }

  // Check if target member exists
  const targetMember =
    await MyGlobal.prisma.economic_discussion_members.findUnique({
      where: { id: props.memberId },
    });

  if (!targetMember) {
    throw new HttpException("Member not found", 404);
  }

  // Prevent self-deletion
  if (props.memberId === props.moderator.id) {
    throw new HttpException("Cannot delete your own account", 403);
  }

  // Delete member sessions first (due to foreign key constraints), then member
  await MyGlobal.prisma.economic_discussion_member_sessions.deleteMany({
    where: { economic_discussion_member_id: props.memberId },
  });

  // Delete the member account
  await MyGlobal.prisma.economic_discussion_members.delete({
    where: { id: props.memberId },
  });
}
