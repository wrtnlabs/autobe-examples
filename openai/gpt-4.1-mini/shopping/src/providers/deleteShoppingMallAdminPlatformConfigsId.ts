import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminPlatformConfigsId(props: {
  admin: AdminPayload;
  id: string;
}): Promise<void> {
  const { id } = props;

  try {
    await MyGlobal.prisma.shopping_mall_platform_configs.findUniqueOrThrow({
      where: { id },
      select: { id: true },
    });
  } catch {
    throw new HttpException("Platform configuration not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_platform_configs.delete({
    where: { id },
  });
}
