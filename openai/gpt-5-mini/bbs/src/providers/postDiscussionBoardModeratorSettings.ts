import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorSettings(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardSetting.ICreate;
}): Promise<IDiscussionBoardSetting> {
  const { moderator, body } = props;

  // Authorization: verify moderator exists and is active
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
      select: { id: true, deleted_at: true },
    });

  if (!moderatorRecord || moderatorRecord.deleted_at !== null) {
    throw new HttpException(
      "Unauthorized: moderator not found or inactive",
      403,
    );
  }

  // Uniqueness check for key
  const existing = await MyGlobal.prisma.discussion_board_settings.findUnique({
    where: { key: body.key },
    select: { id: true },
  });

  if (existing) {
    throw new HttpException(
      "Conflict: A setting with the given key already exists",
      409,
    );
  }

  // Prepare timestamp
  const now = toISOStringSafe(new Date());

  // Create setting
  const created = await MyGlobal.prisma.discussion_board_settings.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      key: body.key,
      value: body.value,
      description: body.description ?? null,
      is_active: body.is_active ?? true,
      created_at: now,
      updated_at: now,
    },
  });

  // Record audit entry for creation
  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_moderator_id: moderator.id,
      event_type: "setting.created",
      event_payload: JSON.stringify({
        key: body.key,
        moderator_id: moderator.id,
      }),
      occurred_at: now,
    },
  });

  // Map DB result to API DTO, handling optional/nullable fields correctly
  return {
    id: created.id as string & tags.Format<"uuid">,
    key: created.key,
    value: created.value,
    description: created.description === null ? undefined : created.description,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
