import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerLowStockAlertsId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  const alert = await MyGlobal.prisma.shopping_mall_low_stock_alerts.findUnique(
    {
      where: { id },
    },
  );

  if (!alert) {
    throw new HttpException("Low stock alert not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_low_stock_alerts.delete({
    where: { id },
  });
}
