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

export async function deleteShoppingMallAdministratorProductCategoriesProductCategoryIdSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  subcategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate existence of the product category
  await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
    where: { id: props.productCategoryId },
  });
  // Validate existence of the subcategory scoped under the product category
  await MyGlobal.prisma.shopping_mall_product_subcategories.findFirstOrThrow({
    where: {
      id: props.subcategoryId,
      shopping_mall_product_category_id: props.productCategoryId,
    },
  });
  // Use a transaction to ensure atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Reassign all products linked to this subcategory to uncategorized (null)
    await tx.shopping_mall_products.updateMany({
      where: { product_subcategory_id: props.subcategoryId },
      data: { product_subcategory_id: { set: undefined } },
    });
    // Delete the subcategory
    await tx.shopping_mall_product_subcategories.delete({
      where: { id: props.subcategoryId },
    });
  });
}
