import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminSystemSettingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSystemSetting.IUpdate;
}): Promise<IShoppingMallSystemSetting> {
  const { id, body } = props;

  const existing =
    await MyGlobal.prisma.shopping_mall_system_settings.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new HttpException("System setting not found", 404);
  }

  const updatedAt = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_system_settings.update({
    where: { id },
    data: {
      key: body.key,
      value: body.value,
      description:
        body.description === null ? null : (body.description ?? undefined),
      updated_at: updatedAt,
    },
  });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
