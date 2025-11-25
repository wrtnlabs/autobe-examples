import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSalesSaleCode(props: {
  admin: AdminPayload;
  saleCode: string;
}): Promise<void> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_sales.delete({
    where: {
      id: sale.id,
    },
  });
}
