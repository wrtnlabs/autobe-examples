import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallSkuAttributeValuesId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSkuAttributeValue.IUpdate;
}): Promise<IShoppingMallSkuAttributeValue> {
  const existing =
    await MyGlobal.prisma.shopping_mall_sku_attribute_values.findUnique({
      where: { id: props.id },
    });

  if (!existing) {
    throw new HttpException("SKU attribute value not found", 404);
  }

  // Update the SKU attribute value
  const updated =
    await MyGlobal.prisma.shopping_mall_sku_attribute_values.update({
      where: { id: props.id },
      data: {
        code: props.body.code,
        value: props.body.value ?? existing.value,
        description:
          props.body.description === undefined
            ? existing.description
            : props.body.description,
      },
    });

  return {
    id: updated.id,
    shopping_mall_sku_attribute_id: updated.shopping_mall_sku_attribute_id,
    value: updated.value,
    code: updated.code,
    description: updated.description ?? null,
  };
}
