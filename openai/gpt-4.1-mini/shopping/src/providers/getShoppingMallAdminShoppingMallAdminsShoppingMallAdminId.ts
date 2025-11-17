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

export async function getShoppingMallAdminShoppingMallAdminsShoppingMallAdminId(props: {
  admin: AdminPayload;
  shoppingMallAdminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const record = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.shoppingMallAdminId },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!record) {
    throw new HttpException("Shopping mall administrator not found.", 404);
  }

  return {
    id: record.id,
    email: record.email,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
