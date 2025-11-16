import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallSkuOptionGroupsCode(props: {
  admin: AdminPayload;
  code: string;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.shopping_mall_sku_option_groups.findUnique({
      where: { code: props.code },
    });

  if (!existing) {
    throw new HttpException(
      `SKU Option Group not found: code=${props.code}`,
      404,
    );
  }

  await MyGlobal.prisma.shopping_mall_sku_option_groups.delete({
    where: { code: props.code },
  });
}
