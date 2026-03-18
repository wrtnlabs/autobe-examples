import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantOptionTransformer } from "../transformers/ShoppingMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOption.IUpdate;
}): Promise<IShoppingMallProductVariantOption> {
  const target =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
          productVariant: {
            select: {
              id: true,
              shopping_mall_product_id: true,
            },
          },
        },
      },
    );
  if (target.shopping_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Not Found", 404);
  }
  if (target.productVariant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.option_name !== undefined) {
      const conflict = await tx.shopping_mall_product_variant_options.findFirst(
        {
          where: {
            shopping_mall_product_variant_id: props.variantId,
            option_name: props.body.option_name,
            deleted_at: null,
            NOT: { id: props.optionId },
          },
          select: { id: true },
        },
      );
      if (conflict !== null) {
        throw new HttpException(
          "Conflicting option name within the same variant",
          409,
        );
      }
    }
    await tx.shopping_mall_product_variant_options.update({
      where: { id: props.optionId },
      data: {
        ...(props.body.option_name !== undefined && {
          option_name: props.body.option_name,
        }),
        ...(props.body.option_value !== undefined && {
          option_value: props.body.option_value,
        }),
      },
    });
    return await tx.shopping_mall_product_variant_options.findUniqueOrThrow({
      where: { id: props.optionId },
      ...ShoppingMallProductVariantOptionTransformer.select(),
    });
  });
  return await ShoppingMallProductVariantOptionTransformer.transform(updated);
}
