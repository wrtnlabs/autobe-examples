import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerProductsProductIdOptionDefinitionsOptionDefinitionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionDefinitionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        seller_id: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify option definition exists and belongs to the product
  const optionDefinition =
    await MyGlobal.prisma.shopping_mall_product_option_definitions.findUniqueOrThrow(
      {
        where: {
          id: props.optionDefinitionId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_product_id: true,
        },
      },
    );
  if (optionDefinition.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  // Soft delete the option definition (cascade handles option values and variant options)
  await MyGlobal.prisma.shopping_mall_product_option_definitions.update({
    where: { id: props.optionDefinitionId },
    data: {
      deleted_at: new Date(),
    },
  });
}
