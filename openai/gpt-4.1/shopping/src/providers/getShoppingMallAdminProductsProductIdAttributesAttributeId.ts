import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminProductsProductIdAttributesAttributeId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttribute> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        id: props.attributeId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new HttpException(
      "Product attribute not found or not associated with product.",
      404,
    );
  }
  return {
    id: record.id,
    shopping_mall_product_id: record.shopping_mall_product_id,
    attribute_name: record.attribute_name,
    position: record.position,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== null
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
