import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSubcategoryTransformer } from "../transformers/ShoppingMallProductSubcategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorProductCategoriesProductCategoryIdProductSubcategoriesProductSubcategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  productSubcategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.IUpdate;
}): Promise<IShoppingMallProductSubcategory> {
  // Validate product category existence
  await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
    where: { id: props.productCategoryId },
  });
  // Validate subcategory existence and correct parent
  const existingSubcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findUniqueOrThrow(
      {
        where: { id: props.productSubcategoryId },
        select: { shopping_mall_product_category_id: true },
      },
    );
  if (
    existingSubcategory.shopping_mall_product_category_id !==
    props.productCategoryId
  ) {
    throw new HttpException(
      "Product subcategory does not belong to the specified product category",
      400,
    );
  }
  // If updating name, ensure uniqueness within the productCategoryId
  if (props.body.name !== undefined) {
    const conflict =
      await MyGlobal.prisma.shopping_mall_product_subcategories.findFirst({
        where: {
          shopping_mall_product_category_id: props.productCategoryId,
          name: props.body.name,
          id: { not: props.productSubcategoryId },
        },
      });
    if (conflict) {
      throw new HttpException(
        "Product subcategory name already exists within the product category",
        400,
      );
    }
  }
  // Perform update in a transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_subcategories.update({
      where: { id: props.productSubcategoryId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    });
    const record =
      await tx.shopping_mall_product_subcategories.findUniqueOrThrow({
        where: { id: props.productSubcategoryId },
        ...ShoppingMallProductSubcategoryTransformer.select(),
      });
    return record;
  });
  return ShoppingMallProductSubcategoryTransformer.transform(updated);
}
