import { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
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

export async function putEcommerceAdminSystemConfigsKey(props: {
  admin: AdminPayload;
  key: string;
  body: IEcommerceSystemConfig.IUpdate;
}): Promise<IEcommerceSystemConfig> {
  const existing = await MyGlobal.prisma.ecommerce_system_configs.findFirst({
    where: { key: props.key },
  });
  if (!existing) {
    throw new HttpException("Configuration key not found", 404);
  }
  const updated = await MyGlobal.prisma.ecommerce_system_configs.update({
    where: { key: props.key },
    data: {
      value: props.body.value,
      description: props.body.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    systemStatus: "operational",
    newOrdersToday: 0,
    revenueToday: 0,
    activeSellers: 0,
    newSellersRatio: "0%",
    systemUptime: 0,
    pendingCancellations: 0,
  };
}
