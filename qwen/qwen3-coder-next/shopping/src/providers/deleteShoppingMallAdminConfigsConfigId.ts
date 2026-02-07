import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string;
}): Promise<void> {
  const config =
    await MyGlobal.prisma.shopping_mall_systematic_configs.findUnique({
      where: { id: props.configId },
    });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  if (config.deleted_at !== null) {
    throw new HttpException("Configuration already deleted", 400);
  }
  const activeCategories =
    await MyGlobal.prisma.shopping_mall_systematic_configs.findMany({
      where: { deleted_at: null },
    });
  if (activeCategories.length <= 1) {
    throw new HttpException(
      "Cannot delete the only active configuration in its category",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_systematic_configs.update({
    where: { id: props.configId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  await MyGlobal.prisma.shopping_mall_systematic_logs.create({
    data: {
      id: v4(),
      severity: "INFO" as const,
      component: "SYSTEM" as const,
      message: `Configuration ${props.configId} deleted by admin ${props.admin.id}`,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
