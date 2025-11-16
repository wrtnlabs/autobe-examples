import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallSkuAttributeValuesId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSkuAttributeValue> {
  const record =
    await MyGlobal.prisma.shopping_mall_sku_attribute_values.findUnique({
      where: { id: props.id },
    });

  if (!record) {
    throw new HttpException("SKU attribute value not found", 404);
  }

  return {
    id: record.id,
    shopping_mall_sku_attribute_id: record.shopping_mall_sku_attribute_id,
    value: record.value,
    code: record.code,
    description: record.description ?? null,
  };
}
