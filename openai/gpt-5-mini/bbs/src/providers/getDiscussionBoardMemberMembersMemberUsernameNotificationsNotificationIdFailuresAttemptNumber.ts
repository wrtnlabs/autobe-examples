import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationFailure";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberMembersMemberUsernameNotificationsNotificationIdFailuresAttemptNumber(props: {
  member: MemberPayload;
  memberUsername: string;
  notificationId: string & tags.Format<"uuid">;
  attemptNumber: number & tags.Type<"int32">;
}): Promise<IDiscussionBoardNotificationFailure> {
  const { member, memberUsername, notificationId, attemptNumber } = props;

  // Business validation: attemptNumber must be a positive integer
  if (attemptNumber < 1) {
    throw new HttpException("Invalid attempt number", 400);
  }

  // Verify the username exists and obtain its member id
  const targetMember =
    await MyGlobal.prisma.discussion_board_member.findUniqueOrThrow({
      where: { username: memberUsername },
      select: { id: true },
    });

  // Load the notification and ensure it exists
  const notification =
    await MyGlobal.prisma.discussion_board_notifications.findUniqueOrThrow({
      where: { id: notificationId },
      select: { id: true, recipient_member_id: true },
    });

  // If the notification is not associated with the provided username, respond 404
  if (notification.recipient_member_id !== targetMember.id) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: ensure the authenticated member is the owner of the notification
  if (member.id !== notification.recipient_member_id) {
    throw new HttpException(
      "Unauthorized: You can only view your own notification failures",
      403,
    );
  }

  // Retrieve the specific failure record using composite key (notification id + attempt number)
  const failure =
    await MyGlobal.prisma.discussion_board_notification_failures.findFirstOrThrow(
      {
        where: {
          discussion_board_notification_id: notificationId,
          attempt_number: attemptNumber,
        },
        select: {
          id: true,
          discussion_board_notification_id: true,
          attempt_number: true,
          attempted_at: true,
          error_code: true,
          error_message: true,
          backoff_until: true,
          created_at: true,
        },
      },
    );

  // Map DB fields to API DTO, converting Date -> ISO strings using toISOStringSafe
  return {
    id: failure.id as string & tags.Format<"uuid">,
    notificationId: failure.discussion_board_notification_id as string &
      tags.Format<"uuid">,
    attemptNumber: failure.attempt_number satisfies number as number,
    attemptedAt: toISOStringSafe(failure.attempted_at),
    errorCode: failure.error_code ?? null,
    errorMessage: failure.error_message ?? null,
    backoffUntil: failure.backoff_until
      ? toISOStringSafe(failure.backoff_until)
      : null,
    createdAt: toISOStringSafe(failure.created_at),
  };
}
