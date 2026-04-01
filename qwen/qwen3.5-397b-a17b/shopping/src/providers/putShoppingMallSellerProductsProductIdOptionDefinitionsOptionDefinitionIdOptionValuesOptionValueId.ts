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
import { ShoppingMallProductOptionValueTransformer } from "../transformers/ShoppingMallProductOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdOptionDefinitionsOptionDefinitionIdOptionValuesOptionValueId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionDefinitionId: string & tags.Format<"uuid">;
  optionValueId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOptionValue.IUpdate;
}): Promise<IShoppingMallProductOptionValue> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  );
  const optionDefinition =
    await MyGlobal.prisma.shopping_mall_product_option_definitions.findUniqueOrThrow(
      {
        where: {
          id: props.optionDefinitionId,
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
      },
    );
  const optionValue =
    await MyGlobal.prisma.shopping_mall_product_option_values.findUniqueOrThrow(
      {
        where: {
          id: props.optionValueId,
          shopping_mall_product_option_definition_id: props.optionDefinitionId,
          deleted_at: null,
        },
      },
    );
  if (props.body.name !== undefined) {
    const existingOptionValue =
      await MyGlobal.prisma.shopping_mall_product_option_values.findFirst({
        where: {
          shopping_mall_product_option_definition_id: props.optionDefinitionId,
          name: props.body.name,
          id: {
            not: props.optionValueId,
          },
          deleted_at: null,
        },
      });
    if (existingOptionValue !== null) {
      throw new HttpException(
        "Option value name must be unique within the option definition",
        400,
      );
    }
  }
  await MyGlobal.prisma.shopping_mall_product_option_values.update({
    where: {
      id: props.optionValueId,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_product_option_values.findUniqueOrThrow(
      {
        where: {
          id: props.optionValueId,
        },
        ...ShoppingMallProductOptionValueTransformer.select(),
      },
    );
  return await ShoppingMallProductOptionValueTransformer.transform(updated);
}
