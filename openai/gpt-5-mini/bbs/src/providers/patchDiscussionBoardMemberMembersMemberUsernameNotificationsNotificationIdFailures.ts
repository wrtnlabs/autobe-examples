import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationFailure";
import { IPageIDiscussionBoardNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationFailure";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberMembersMemberUsernameNotificationsNotificationIdFailures(props: {
  member: MemberPayload;
  memberUsername: string;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardNotificationFailure.IRequest;
}): Promise<IPageIDiscussionBoardNotificationFailure.ISummary> {
  const { member, memberUsername, notificationId, body } = props;

  // Verify target member exists
  const targetMember = await MyGlobal.prisma.discussion_board_member.findUnique(
    {
      where: { username: memberUsername },
      select: { id: true },
    },
  );
  if (!targetMember) throw new HttpException("Not Found", 404);

  // Verify notification exists
  const notification =
    await MyGlobal.prisma.discussion_board_notifications.findUnique({
      where: { id: notificationId },
      select: { id: true, recipient_member_id: true },
    });
  if (!notification) throw new HttpException("Not Found", 404);

  // Verify notification is associated with the memberUsername
  if (notification.recipient_member_id !== targetMember.id) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only the member owner may view failures (no elevated role provided)
  if (member.id !== targetMember.id) {
    throw new HttpException("Unauthorized: Access denied", 403);
  }

  // Pagination defaults and limits
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  if (limit <= 0)
    throw new HttpException("Bad Request: limit must be positive", 400);
  const skip = (page - 1) * limit;

  // Sorting mapping
  const sort = body.sort ?? "-attemptedAt";
  const orderBy =
    sort === "attemptedAt"
      ? { attempted_at: "asc" as const }
      : sort === "-attemptedAt"
        ? { attempted_at: "desc" as const }
        : sort === "createdAt"
          ? { created_at: "asc" as const }
          : sort === "-createdAt"
            ? { created_at: "desc" as const }
            : { attempted_at: "desc" as const };

  // Build conditional includes inline for where (keeps Prisma inline parameter rule)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_notification_failures.findMany({
      where: {
        discussion_board_notification_id: notificationId,
        ...(body.attemptNumberFrom !== undefined &&
          body.attemptNumberFrom !== null && {
            attempt_number: { gte: body.attemptNumberFrom },
          }),
        ...(body.attemptNumberTo !== undefined &&
          body.attemptNumberTo !== null && {
            attempt_number: { lte: body.attemptNumberTo },
          }),
        ...(body.attemptedAtFrom !== undefined &&
          body.attemptedAtFrom !== null && {
            attempted_at: { gte: body.attemptedAtFrom },
          }),
        ...(body.attemptedAtTo !== undefined &&
          body.attemptedAtTo !== null && {
            attempted_at: { lte: body.attemptedAtTo },
          }),
        ...(body.createdAtFrom !== undefined &&
          body.createdAtFrom !== null && {
            created_at: { gte: body.createdAtFrom },
          }),
        ...(body.createdAtTo !== undefined &&
          body.createdAtTo !== null && {
            created_at: { lte: body.createdAtTo },
          }),
        ...(body.errorCode !== undefined &&
          body.errorCode !== null && { error_code: body.errorCode }),
        ...(body.errorMessageQuery !== undefined &&
          body.errorMessageQuery !== null && {
            error_message: { contains: body.errorMessageQuery },
          }),
      },
      orderBy,
      skip,
      take: limit,
    }),

    MyGlobal.prisma.discussion_board_notification_failures.count({
      where: {
        discussion_board_notification_id: notificationId,
        ...(body.attemptNumberFrom !== undefined &&
          body.attemptNumberFrom !== null && {
            attempt_number: { gte: body.attemptNumberFrom },
          }),
        ...(body.attemptNumberTo !== undefined &&
          body.attemptNumberTo !== null && {
            attempt_number: { lte: body.attemptNumberTo },
          }),
        ...(body.attemptedAtFrom !== undefined &&
          body.attemptedAtFrom !== null && {
            attempted_at: { gte: body.attemptedAtFrom },
          }),
        ...(body.attemptedAtTo !== undefined &&
          body.attemptedAtTo !== null && {
            attempted_at: { lte: body.attemptedAtTo },
          }),
        ...(body.createdAtFrom !== undefined &&
          body.createdAtFrom !== null && {
            created_at: { gte: body.createdAtFrom },
          }),
        ...(body.createdAtTo !== undefined &&
          body.createdAtTo !== null && {
            created_at: { lte: body.createdAtTo },
          }),
        ...(body.errorCode !== undefined &&
          body.errorCode !== null && { error_code: body.errorCode }),
        ...(body.errorMessageQuery !== undefined &&
          body.errorMessageQuery !== null && {
            error_message: { contains: body.errorMessageQuery },
          }),
      },
    }),
  ]);

  // Map rows to DTOs
  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    notificationId: r.discussion_board_notification_id as string &
      tags.Format<"uuid">,
    attemptNumber: r.attempt_number,
    attemptedAt: toISOStringSafe(r.attempted_at),
    errorCode: r.error_code ?? null,
    errorMessage: r.error_message ?? null,
    backoffUntil: r.backoff_until ? toISOStringSafe(r.backoff_until) : null,
    createdAt: toISOStringSafe(r.created_at),
  }));

  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;

  return {
    pagination,
    data,
  };
}
