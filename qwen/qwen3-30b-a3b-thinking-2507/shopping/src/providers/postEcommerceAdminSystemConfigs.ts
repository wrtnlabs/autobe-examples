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

export async function postEcommerceAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IEcommerceSystemConfig.ICreate;
}): Promise<IEcommerceSystemConfig> {
  try {
    const created = await MyGlobal.prisma.ecommerce_system_configs.create({
      data: {
        id: v4(),
        key: props.body.key,
        value: props.body.value,
        description: props.body.description,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
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
      catch(error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new HttpException("Key already exists", 409);
        }
        throw error;
      },
    };
  } finally {
  }
}
