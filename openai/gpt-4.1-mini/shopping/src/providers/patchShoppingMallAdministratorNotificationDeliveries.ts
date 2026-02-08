import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorNotificationDeliveries(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallNotificationDelivery.IRequest;
}): Promise<IPageIShoppingMallNotificationDelivery.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };
  const data =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ attempted_at: "desc" }, { id: "desc" }],
    });
  const total =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.count({
      where,
    });
  return {
    data: [],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
