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
import { ShoppingMallProductOptionValueCollector } from "../collectors/ShoppingMallProductOptionValueCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductOptionValueTransformer } from "../transformers/ShoppingMallProductOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdOptionDefinitionsOptionDefinitionIdOptionValues(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionDefinitionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.ICreate;
}): Promise<IShoppingMallProductOptionValue> {
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
        select: { id: true, shopping_mall_product_id: true },
      },
    );
  if (optionDefinition.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Option definition does not belong to this product",
      400,
    );
  }
  const created =
    await MyGlobal.prisma.shopping_mall_product_option_values.create({
      data: await ShoppingMallProductOptionValueCollector.collect({
        body: props.body,
        optionDefinition: { id: props.optionDefinitionId },
      }),
      ...ShoppingMallProductOptionValueTransformer.select(),
    });
  return await ShoppingMallProductOptionValueTransformer.transform(created);
}
