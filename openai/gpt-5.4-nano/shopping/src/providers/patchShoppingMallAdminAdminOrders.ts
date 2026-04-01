import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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

export async function patchShoppingMallAdminAdminOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder.ISummary> {
  // This operation requires an admin oversight target (order/orderItem ids and force action),
  // but the provided function signature uses IShoppingMallOrder.IUpdate which only contains
  // shipment header fields. Without an order identifier in props, the target cannot be
  // resolved safely.
  throw new HttpException(
    "Missing order targeting information for admin oversight",
    400,
  );
}
