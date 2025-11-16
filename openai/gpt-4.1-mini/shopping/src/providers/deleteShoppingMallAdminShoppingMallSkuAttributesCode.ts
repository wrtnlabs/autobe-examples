import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallSkuAttributesCode(props: {
  admin: AdminPayload;
  code: string;
}): Promise<void> {
  const record = await MyGlobal.prisma.shopping_mall_sku_attributes.findUnique({
    where: { code: props.code },
  });

  if (!record) {
    throw new HttpException(
      `SKU attribute with code ${props.code} not found`,
      404,
    );
  }

  await MyGlobal.prisma.shopping_mall_sku_attributes.delete({
    where: { code: props.code },
  });
}
