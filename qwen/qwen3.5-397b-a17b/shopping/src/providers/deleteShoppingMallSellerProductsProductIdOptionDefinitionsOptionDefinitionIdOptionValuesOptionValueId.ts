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

export async function deleteShoppingMallSellerProductsProductIdOptionDefinitionsOptionDefinitionIdOptionValuesOptionValueId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionDefinitionId: string & tags.Format<"uuid">;
  optionValueId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const optionDefinition =
    await MyGlobal.prisma.shopping_mall_product_option_definitions.findUniqueOrThrow(
      {
        where: { id: props.optionDefinitionId },
        select: { id: true, shopping_mall_product_id: true, deleted_at: true },
      },
    );
  if (optionDefinition.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (optionDefinition.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const optionValue =
    await MyGlobal.prisma.shopping_mall_product_option_values.findUniqueOrThrow(
      {
        where: { id: props.optionValueId },
        select: {
          id: true,
          shopping_mall_product_option_definition_id: true,
          deleted_at: true,
        },
      },
    );
  if (optionValue.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    optionValue.shopping_mall_product_option_definition_id !==
    props.optionDefinitionId
  ) {
    throw new HttpException("Not Found", 404);
  }
  const activeVariantOptions =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findMany({
      where: {
        shopping_mall_product_option_value_id: props.optionValueId,
        deleted_at: null,
        variant: {
          deleted_at: null,
        },
      },
      select: { id: true },
    });
  if (activeVariantOptions.length > 0) {
    throw new HttpException(
      "Conflict: Option value is currently used in active product variants",
      409,
    );
  }
  await MyGlobal.prisma.shopping_mall_product_option_values.update({
    where: { id: props.optionValueId },
    data: {
      deleted_at: new Date(),
    },
  });
}
