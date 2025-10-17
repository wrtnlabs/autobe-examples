import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSystemConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSystemConfig> {
  const config =
    await MyGlobal.prisma.shopping_mall_system_configs.findUniqueOrThrow({
      where: { id: props.configId },
      select: {
        id: true,
        config_key: true,
        config_value: true,
        description: true,
      },
    });

  return {
    id: config.id as string & tags.Format<"uuid">,
    config_key: config.config_key,
    config_value: config.config_value,
    description: config.description,
  };
}
