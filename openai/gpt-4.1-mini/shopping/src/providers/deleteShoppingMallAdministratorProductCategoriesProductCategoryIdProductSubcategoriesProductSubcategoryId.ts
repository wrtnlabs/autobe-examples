import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorProductCategoriesProductCategoryIdProductSubcategoriesProductSubcategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  productSubcategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.productCategoryId },
      select: { id: true },
    });
  if (category === null) {
    throw new HttpException("Product category not found", 404);
  }
  const subcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findUnique({
      where: { id: props.productSubcategoryId },
      select: { id: true, shopping_mall_product_category_id: true },
    });
  if (
    subcategory === null ||
    subcategory.shopping_mall_product_category_id !== props.productCategoryId
  ) {
    throw new HttpException(
      "Product subcategory not found or does not belong to the specified category",
      404,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_products.updateMany({
      where: { product_subcategory_id: props.productSubcategoryId },
      data: { product_subcategory_id: { set: undefined } },
    });
    await prisma.shopping_mall_product_subcategories.delete({
      where: { id: props.productSubcategoryId },
    });
  });
}
