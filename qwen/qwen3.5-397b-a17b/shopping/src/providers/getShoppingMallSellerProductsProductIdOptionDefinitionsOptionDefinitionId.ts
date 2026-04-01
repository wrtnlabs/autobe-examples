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

export async function getShoppingMallSellerProductsProductIdOptionDefinitionsOptionDefinitionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionDefinitionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductOptionDefinition> {
  const optionDefinition =
    await MyGlobal.prisma.shopping_mall_product_option_definitions.findUnique({
      where: { id: props.optionDefinitionId },
      ...ShoppingMallProductOptionDefinitionTransformer.select(),
    });
  if (optionDefinition === null) {
    throw new HttpException("Not Found", 404);
  }
  if (optionDefinition.product.id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  if (optionDefinition.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await ShoppingMallProductOptionDefinitionTransformer.transform(
    optionDefinition,
  );
}
