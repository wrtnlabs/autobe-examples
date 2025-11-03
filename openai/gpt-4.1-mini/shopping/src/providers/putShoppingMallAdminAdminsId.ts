import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  const { id, body } = props;

  // Fetch the admin to confirm existence & non-deleted state
  const existingAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: {
        id,
        deleted_at: null,
      },
    });

  // Perform the update
  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id },
    data: {
      email: body.email,
      full_name: body.full_name,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
