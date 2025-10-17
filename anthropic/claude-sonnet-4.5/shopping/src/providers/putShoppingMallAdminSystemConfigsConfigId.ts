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

export async function putShoppingMallAdminSystemConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
  body: IShoppingMallSystemConfig.IUpdate;
}): Promise<IShoppingMallSystemConfig> {
  const { configId, body } = props;

  const updated = await MyGlobal.prisma.shopping_mall_system_configs.update({
    where: { id: configId },
    data: {
      config_value: body.config_value ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    description: updated.description,
  };
}
