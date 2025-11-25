import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallPermissionsName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<void> {
  const permission = await MyGlobal.prisma.shopping_mall_permissions.findUnique(
    {
      where: { name: props.name },
    },
  );

  if (!permission) {
    throw new HttpException("Permission not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_permissions.delete({
    where: { name: props.name },
  });
}
