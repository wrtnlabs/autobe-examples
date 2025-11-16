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

export async function postShoppingMallSellerShoppingMallSkuAttributeValues(props: {
  seller: SellerPayload;
  body: IShoppingMallSkuAttributeValue.ICreate;
}): Promise<IShoppingMallSkuAttributeValue> {
  const now = new Date();
  const created =
    await MyGlobal.prisma.shopping_mall_sku_attribute_values.create({
      data: {
        id: v4(),
        shopping_mall_sku_attribute_id:
          props.body.shopping_mall_sku_attribute_id,
        value: props.body.value,
        code: props.body.code,
        description: props.body.description ?? null,
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
      },
    });

  return {
    id: created.id,
    shopping_mall_sku_attribute_id: created.shopping_mall_sku_attribute_id,
    value: created.value,
    code: created.code,
    description: created.description ?? null,
  };
}
