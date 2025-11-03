import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminPlatformAnnouncementsPlatformAnnouncementId(props: {
  admin: AdminPayload;
  platformAnnouncementId: string & tags.Format<"uuid">;
  body: IShoppingPlatformAnnouncement.IUpdate;
}): Promise<IShoppingPlatformAnnouncement> {
  const { admin, platformAnnouncementId, body } = props;

  // 1. Fetch the existing announcement, error if not found
  const existing =
    await MyGlobal.prisma.shopping_platform_announcements.findUnique({
      where: { id: platformAnnouncementId },
    });
  if (!existing) {
    throw new HttpException("Announcement not found", 404);
  }

  // 2. Prevent duplicate title among other non-deleted announcements (excluding self)
  const duplicate =
    await MyGlobal.prisma.shopping_platform_announcements.findFirst({
      where: {
        id: { not: platformAnnouncementId },
        title: body.title,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new HttpException("Duplicate title for active announcement", 409);
  }

  // 3. Prepare update values; always set updated_at
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_platform_announcements.update({
    where: { id: platformAnnouncementId },
    data: {
      title: body.title,
      body: body.body,
      target_audience: body.target_audience,
      status: body.status,
      publish_start_at:
        typeof body.publish_start_at !== "undefined"
          ? (body.publish_start_at ?? null)
          : null,
      publish_end_at:
        typeof body.publish_end_at !== "undefined"
          ? (body.publish_end_at ?? null)
          : null,
      updated_at: now,
    },
  });

  // 4. Return the full announcement object, converting date-times w/ toISOStringSafe
  return {
    id: updated.id,
    admin_id: updated.admin_id,
    title: updated.title,
    body: updated.body,
    target_audience: updated.target_audience,
    status: updated.status,
    publish_start_at:
      updated.publish_start_at !== null &&
      typeof updated.publish_start_at !== "undefined"
        ? toISOStringSafe(updated.publish_start_at)
        : undefined,
    publish_end_at:
      updated.publish_end_at !== null &&
      typeof updated.publish_end_at !== "undefined"
        ? toISOStringSafe(updated.publish_end_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
