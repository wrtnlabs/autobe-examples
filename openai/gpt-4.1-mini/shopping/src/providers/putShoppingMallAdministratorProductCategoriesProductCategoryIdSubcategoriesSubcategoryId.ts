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

export async function putShoppingMallAdministratorProductCategoriesProductCategoryIdSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  subcategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.IUpdate;
}): Promise<IShoppingMallProductSubcategory> {
  const { administrator, productCategoryId, subcategoryId, body } = props;
  // Validate existence of parent category
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: productCategoryId },
    });
  if (!category) {
    throw new HttpException(
      `Product category ${productCategoryId} not found`,
      404,
    );
  }
  // Validate subcategory existence scoped under parent category
  const subcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findUnique({
      where: { id: subcategoryId },
    });
  if (
    !subcategory ||
    subcategory.shopping_mall_product_category_id !== productCategoryId
  ) {
    throw new HttpException(
      `Product subcategory ${subcategoryId} not found under category ${productCategoryId}`,
      404,
    );
  }
  // Validate name uniqueness if provided
  if (body.name !== undefined) {
    const existing =
      await MyGlobal.prisma.shopping_mall_product_subcategories.findFirst({
        where: {
          name: body.name,
          shopping_mall_product_category_id: productCategoryId,
          NOT: { id: subcategoryId },
        },
      });
    if (existing) {
      throw new HttpException(
        `Subcategory name '${body.name}' already exists in the category`,
        400,
      );
    }
  }
  // Perform update with ISO string for updated_at
  const updatedSubcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.update({
      where: { id: subcategoryId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      ...ShoppingMallProductSubcategoryTransformer.select(),
    });
  // Transform and return
  return await ShoppingMallProductSubcategoryTransformer.transform(
    updatedSubcategory,
  );
}
