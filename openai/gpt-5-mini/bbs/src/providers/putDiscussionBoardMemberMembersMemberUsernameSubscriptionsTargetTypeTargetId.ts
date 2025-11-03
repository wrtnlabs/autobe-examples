import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberMembersMemberUsernameSubscriptionsTargetTypeTargetId(props: {
  member: MemberPayload;
  memberUsername: string;
  targetType: string;
  targetId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSubscription.ICreate;
}): Promise<IDiscussionBoardSubscription> {
  const { member, memberUsername, targetType, targetId, body } = props;

  // Resolve member by username (ensure not deleted)
  const targetMember = await MyGlobal.prisma.discussion_board_member.findFirst({
    where: {
      username: memberUsername,
      deleted_at: null,
    },
  });
  if (!targetMember) {
    throw new HttpException("Member not found", 404);
  }

  // Authorization: only the member themself (or admin, but admin payload not in props)
  if (member.id !== targetMember.id) {
    throw new HttpException(
      "Unauthorized: cannot modify another member's subscriptions",
      403,
    );
  }

  // Validate path/body consistency
  if (body.target_type !== targetType || body.target_id !== targetId) {
    throw new HttpException(
      "Path parameters and body must match for target_type and target_id",
      400,
    );
  }

  // Validate allowed target types
  if (targetType !== "article" && targetType !== "author") {
    throw new HttpException(
      'Invalid targetType: must be "article" or "author"',
      400,
    );
  }

  // Verify target existence
  if (targetType === "article") {
    const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
      where: { id: targetId, deleted_at: null },
    });
    if (!article) throw new HttpException("Article not found", 404);
  } else {
    // author
    const author = await MyGlobal.prisma.discussion_board_member.findFirst({
      where: { id: targetId, deleted_at: null },
    });
    if (!author) throw new HttpException("Author not found", 404);
  }

  // Prepare timestamp
  const now = toISOStringSafe(new Date());

  // Idempotent upsert: find existing subscription
  const existing =
    await MyGlobal.prisma.discussion_board_subscriptions.findFirst({
      where: {
        discussion_board_member_id: targetMember.id,
        target_type: targetType,
        target_id: targetId,
        deleted_at: null,
      },
    });

  let record;

  if (existing) {
    // Update existing
    record = await MyGlobal.prisma.discussion_board_subscriptions.update({
      where: { id: existing.id },
      data: {
        delivery_mode: body.delivery_mode,
        active: body.active === undefined ? existing.active : body.active,
        updated_at: now,
      },
    });
  } else {
    // Create new
    record = await MyGlobal.prisma.discussion_board_subscriptions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: targetMember.id,
        target_type: targetType,
        target_id: targetId,
        delivery_mode: body.delivery_mode,
        active: body.active === undefined ? true : body.active,
        last_notified_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  // Build member summary
  const memberSummary = {
    id: targetMember.id as string & tags.Format<"uuid">,
    username: targetMember.username,
    display_name: targetMember.display_name ?? null,
    created_at: toISOStringSafe(targetMember.created_at),
  } satisfies IDiscussionBoardMember.ISummary;

  // Map record to DTO
  const response: IDiscussionBoardSubscription = {
    id: record.id as string & tags.Format<"uuid">,
    member: memberSummary,
    targetType: record.target_type as "article" | "author",
    targetId: record.target_id as string & tags.Format<"uuid">,
    deliveryMode: record.delivery_mode as "immediate" | "daily_digest",
    active: record.active,
    lastNotifiedAt: record.last_notified_at
      ? toISOStringSafe(record.last_notified_at)
      : null,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: record.updated_at ? toISOStringSafe(record.updated_at) : null,
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };

  return response;
}
