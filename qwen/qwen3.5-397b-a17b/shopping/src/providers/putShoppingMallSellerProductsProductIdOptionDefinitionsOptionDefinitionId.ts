import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductOptionDefinitionTransformer } from "../transformers/ShoppingMallProductOptionDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdOptionDefinitionsOptionDefinitionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionDefinitionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionDefinition.IUpdate;
}): Promise<IShoppingMallProductOptionDefinition> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
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
  if (optionDefinition.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Bad Request", 400);
  }
  if (optionDefinition.deleted_at !== null) {
    throw new HttpException("Bad Request", 400);
  }
  if (props.body.name !== undefined) {
    const existing =
      await MyGlobal.prisma.shopping_mall_product_option_definitions.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          name: props.body.name,
          id: { not: props.optionDefinitionId },
          deleted_at: null,
        },
      });
    if (existing) {
      throw new HttpException(
        "Conflict: Option definition name already exists",
        400,
      );
    }
  }
  await MyGlobal.prisma.shopping_mall_product_option_definitions.update({
    where: { id: props.optionDefinitionId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_option_definitions.findUniqueOrThrow(
      {
        where: { id: props.optionDefinitionId },
        ...ShoppingMallProductOptionDefinitionTransformer.select(),
      },
    );
  return await ShoppingMallProductOptionDefinitionTransformer.transform(
    updated,
  );
}
