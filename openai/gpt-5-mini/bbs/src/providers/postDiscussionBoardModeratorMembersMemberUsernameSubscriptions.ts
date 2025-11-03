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

export async function postDiscussionBoardModeratorMembersMemberUsernameSubscriptions(props: {
  memberUsername: string;
  body: IDiscussionBoardSubscription.ICreate;
}): Promise<IDiscussionBoardSubscription> {
  const { memberUsername, body } = props;

  // NOTE: Authorization requirement exists in the API specification
  // (caller must be the member or a moderator). The provider-level props do
  // not include an authentication payload, so this implementation assumes
  // authorization checks are performed by the controller/decorator layer.

  // STEP 1: Verify member exists
  const member = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { username: memberUsername },
  });
  if (!member) throw new HttpException("Member not found", 404);

  // STEP 2: Validate target_type
  if (body.target_type !== "article" && body.target_type !== "author") {
    throw new HttpException("Invalid target_type", 400);
  }

  // STEP 3: Verify referenced target exists
  if (body.target_type === "article") {
    const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: body.target_id },
      select: { id: true, deleted_at: true },
    });
    if (!article || article.deleted_at !== null) {
      throw new HttpException("Target not found", 404);
    }
  } else {
    const author = await MyGlobal.prisma.discussion_board_member.findUnique({
      where: { id: body.target_id },
      select: { id: true, deleted_at: true },
    });
    if (!author || author.deleted_at !== null) {
      throw new HttpException("Target not found", 404);
    }
  }

  // STEP 4: Check for existing non-deleted subscription (idempotency / conflict)
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

  // STEP 5: Prepare timestamps once
  const now = toISOStringSafe(new Date());

  // STEP 6: Create subscription (inline data object)
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

  // STEP 7: Map to API DTO and return
  return {
    id: created.id as string & tags.Format<"uuid">,
    member: {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name: member.display_name ?? null,
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
