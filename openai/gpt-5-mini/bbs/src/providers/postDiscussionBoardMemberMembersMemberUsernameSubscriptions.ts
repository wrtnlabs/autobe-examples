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

export async function postDiscussionBoardMemberMembersMemberUsernameSubscriptions(props: {
  memberUsername: string;
  body: IDiscussionBoardSubscription.ICreate;
}): Promise<IDiscussionBoardSubscription> {
  const { memberUsername, body } = props;

  // CONTRADICTION: The operation specification requires an authenticated caller
  // and authorization logic (caller must be the named member or a moderator),
  // but the provided function props do NOT include any authentication payload.
  // Therefore this implementation cannot perform actor-based authorization and
  // proceeds using the path-provided memberUsername only.

  // Find member by username
  const member = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { username: memberUsername },
  });
  if (!member) throw new HttpException("Not Found: member not found", 404);

  // Validate target_type business rule
  if (body.target_type !== "article" && body.target_type !== "author")
    throw new HttpException("Bad Request: unsupported target_type", 400);

  // Verify referenced resource exists according to target_type
  if (body.target_type === "article") {
    const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: body.target_id },
    });
    if (!article)
      throw new HttpException(
        "Not Found: referenced article does not exist",
        404,
      );
  } else {
    const author = await MyGlobal.prisma.discussion_board_member.findUnique({
      where: { id: body.target_id },
    });
    if (!author)
      throw new HttpException(
        "Not Found: referenced author does not exist",
        404,
      );
  }

  // Enforce uniqueness for active (non-deleted) subscription
  const existing =
    await MyGlobal.prisma.discussion_board_subscriptions.findFirst({
      where: {
        discussion_board_member_id: member.id,
        target_type: body.target_type,
        target_id: body.target_id,
        deleted_at: null,
      },
    });
  if (existing)
    throw new HttpException("Conflict: subscription already exists", 409);

  // Prepare timestamps once and create the record inline
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_subscriptions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: member.id,
      target_type: body.target_type,
      target_id: body.target_id,
      delivery_mode: body.delivery_mode,
      active: body.active ?? true,
      last_notified_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Map Prisma record to API DTO, converting Date -> ISO strings and handling nullability
  return {
    id: created.id as string & tags.Format<"uuid">,
    member: {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name: member.display_name === null ? null : member.display_name,
      created_at: toISOStringSafe(member.created_at),
    },
    targetType: created.target_type as "article" | "author",
    targetId: created.target_id as string & tags.Format<"uuid">,
    deliveryMode: created.delivery_mode as "immediate" | "daily_digest",
    active: created.active,
    lastNotifiedAt: created.last_notified_at
      ? toISOStringSafe(created.last_notified_at)
      : null,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: created.updated_at ? toISOStringSafe(created.updated_at) : null,
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
