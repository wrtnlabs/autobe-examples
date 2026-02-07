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

export async function deleteEcommerceAdminSystemConfigsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<void> {
  const [config] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_system_configs.findUnique({
      where: { key: props.key, deleted_at: null },
    }),
  ]);
  if (!config) {
    throw new HttpException("System config not found", 404);
  }
  await MyGlobal.prisma.ecommerce_system_configs.update({
    where: { id: config.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
