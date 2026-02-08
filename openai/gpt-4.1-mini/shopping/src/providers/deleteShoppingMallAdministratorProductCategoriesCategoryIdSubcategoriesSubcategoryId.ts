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

export async function deleteShoppingMallAdministratorProductCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  subcategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const subcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findFirst({
      where: {
        id: props.subcategoryId,
        shopping_mall_product_category_id: props.categoryId,
      },
      select: { id: true },
    });
  if (!subcategory) {
    throw new HttpException("Subcategory not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_product_subcategories.delete({
    where: { id: props.subcategoryId },
  });
}
