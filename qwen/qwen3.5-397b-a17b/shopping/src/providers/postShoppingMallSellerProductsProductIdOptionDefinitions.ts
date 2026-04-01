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
import { ShoppingMallProductOptionDefinitionCollector } from "../collectors/ShoppingMallProductOptionDefinitionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductOptionDefinitionTransformer } from "../transformers/ShoppingMallProductOptionDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdOptionDefinitions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionDefinition.ICreate;
}): Promise<IShoppingMallProductOptionDefinition> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  const existingOptionDefinition =
    await MyGlobal.prisma.shopping_mall_product_option_definitions.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingOptionDefinition) {
    throw new HttpException(
      "Conflict: Option definition with this name already exists for this product",
      409,
    );
  }
  const created =
    await MyGlobal.prisma.shopping_mall_product_option_definitions.create({
      data: await ShoppingMallProductOptionDefinitionCollector.collect({
        body: props.body,
        product: { id: props.productId },
      }),
      ...ShoppingMallProductOptionDefinitionTransformer.select(),
    });
  return await ShoppingMallProductOptionDefinitionTransformer.transform(
    created,
  );
}
