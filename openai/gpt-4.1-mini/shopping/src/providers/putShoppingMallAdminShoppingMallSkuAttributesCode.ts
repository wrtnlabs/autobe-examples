import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttribute";
import { IShoppingMallSkuAttributeConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeConfigurations";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallSkuAttributesCode(props: {
  admin: AdminPayload;
  code: string;
  body: IShoppingMallSkuAttribute.ICreate;
}): Promise<IShoppingMallSkuAttribute> {
  const existing =
    await MyGlobal.prisma.shopping_mall_sku_attributes.findUnique({
      where: { code: props.code },
    });

  if (!existing) {
    throw new HttpException("SKU attribute not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_sku_attributes.update({
    where: { code: props.code },
    data: {
      code: props.body.code,
      name: props.body.name,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    type: props.body.type satisfies string as string,
    configuration: props.body
      .configuration satisfies IShoppingMallSkuAttributeConfigurations as IShoppingMallSkuAttributeConfigurations,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  } satisfies IShoppingMallSkuAttribute;
}
