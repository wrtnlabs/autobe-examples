import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postDiscussionBoardAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemSetting.ICreate;
}): Promise<IDiscussionBoardSystemSetting> {
  // Check for uniqueness conflict (key must be unique)
  const existing =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { key: props.body.key },
    });
  if (existing) {
    throw new HttpException(
      "A system setting with this key already exists.",
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_system_settings.create(
    {
      data: {
        id: v4(),
        key: props.body.key,
        value: props.body.value,
        description: props.body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    key: created.key,
    value: created.value,
    description: created.description === null ? undefined : created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
