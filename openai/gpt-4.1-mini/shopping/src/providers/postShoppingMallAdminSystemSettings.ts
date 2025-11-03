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

export async function postShoppingMallAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemSetting.ICreate;
}): Promise<IShoppingMallSystemSetting> {
  const { admin, body } = props;
  const now = toISOStringSafe(new Date());
  const id = v4();
  try {
    const created = await MyGlobal.prisma.shopping_mall_system_settings.create({
      data: {
        id,
        key: body.key,
        value: body.value,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id,
      key: created.key,
      value: created.value,
      description: created.description ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      /unique constraint failed on the fields: \(key\)/.test(error.message)
    ) {
      throw new HttpException(
        `Conflict: System setting with key '${body.key}' already exists.`,
        409,
      );
    }
    throw error;
  }
}
