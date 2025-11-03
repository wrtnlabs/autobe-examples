import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminSystemConfigurationsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<void> {
  const found = await MyGlobal.prisma.shopping_system_configurations.findUnique(
    {
      where: { config_key: props.configKey },
    },
  );
  if (!found) {
    throw new HttpException("System configuration not found", 404);
  }
  await MyGlobal.prisma.shopping_system_configurations.delete({
    where: { config_key: props.configKey },
  });
}
