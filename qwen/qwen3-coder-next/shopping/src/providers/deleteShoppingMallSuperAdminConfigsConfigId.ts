import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSuperAdminConfigsConfigId(props: {
  superAdmin: SuperadminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  const config =
    await MyGlobal.prisma.shopping_mall_systematic_configs.findUnique({
      where: { id: props.configId },
    });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  if (config.deleted_at !== null) {
    throw new HttpException("Configuration has already been deleted", 404);
  }
  await MyGlobal.prisma.shopping_mall_systematic_configs.update({
    where: { id: props.configId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
