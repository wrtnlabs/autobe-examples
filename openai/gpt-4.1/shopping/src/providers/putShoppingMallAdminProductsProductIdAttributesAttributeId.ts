import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdAttributesAttributeId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttribute.IUpdate;
}): Promise<IShoppingMallProductAttribute> {
  const attribute =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        id: props.attributeId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!attribute) {
    throw new HttpException(
      "Attribute not found for the specified product.",
      404,
    );
  }

  const duplicate =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        attribute_name: props.body.attribute_name,
        deleted_at: null,
        NOT: { id: props.attributeId },
      },
    });
  if (duplicate) {
    throw new HttpException(
      "Attribute name already exists for this product.",
      409,
    );
  }

  if (!Number.isInteger(props.body.position) || props.body.position < 0) {
    throw new HttpException("Position must be a non-negative integer.", 400);
  }

  const updateData: Record<string, unknown> = {
    attribute_name: props.body.attribute_name,
    position: props.body.position,
    updated_at: toISOStringSafe(new Date()),
  };
  if ("deleted_at" in props.body) {
    updateData.deleted_at = props.body.deleted_at;
  }

  const updated = await MyGlobal.prisma.shopping_mall_product_attributes.update(
    {
      where: { id: props.attributeId },
      data: updateData,
    },
  );

  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    attribute_name: updated.attribute_name,
    position: updated.position,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(typeof updated.deleted_at === "undefined"
      ? {}
      : {
          deleted_at:
            updated.deleted_at === null
              ? null
              : toISOStringSafe(updated.deleted_at),
        }),
  };
}
