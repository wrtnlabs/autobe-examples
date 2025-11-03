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

export async function postShoppingAdminPlatformAnnouncements(props: {
  admin: AdminPayload;
  body: IShoppingPlatformAnnouncement.ICreate;
}): Promise<IShoppingPlatformAnnouncement> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_platform_announcements.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      title: props.body.title,
      body: props.body.body,
      target_audience: props.body.target_audience,
      status: props.body.status,
      publish_start_at: props.body.publish_start_at ?? undefined,
      publish_end_at: props.body.publish_end_at ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });
  return {
    id: created.id,
    admin_id: created.admin_id,
    title: created.title,
    body: created.body,
    target_audience: created.target_audience,
    status: created.status,
    publish_start_at: created.publish_start_at
      ? toISOStringSafe(created.publish_start_at)
      : undefined,
    publish_end_at: created.publish_end_at
      ? toISOStringSafe(created.publish_end_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
