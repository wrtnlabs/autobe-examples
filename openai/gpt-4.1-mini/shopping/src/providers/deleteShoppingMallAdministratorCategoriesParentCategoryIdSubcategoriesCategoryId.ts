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

export async function deleteShoppingMallAdministratorCategoriesParentCategoryIdSubcategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  parentCategoryId: string & tags.Format<"uuid">;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const prisma = MyGlobal.prisma;
  const category = await prisma.shopping_mall_categories.findFirst({
    where: {
      id: props.categoryId,
      parent_category_id: props.parentCategoryId,
    },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  await prisma.$transaction(async (trx) => {
    const subcategories = await trx.shopping_mall_categories.findMany({
      where: { parent_category_id: props.categoryId },
      select: { id: true },
    });
    const subcategoryIds: (string & tags.Format<"uuid">)[] = subcategories.map(
      (subcategory) => subcategory.id,
    );
    if (subcategoryIds.length > 0) {
      await trx.shopping_mall_categories.deleteMany({
        where: { id: { in: subcategoryIds } },
      });
    }
    await trx.shopping_mall_categories.delete({
      where: { id: props.categoryId },
    });
    await trx.shopping_mall_products.updateMany({
      where: {
        product_subcategory_id: { in: [props.categoryId, ...subcategoryIds] },
      },
      data: { product_subcategory_id: undefined },
    });
  });
}
