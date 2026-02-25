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

export async function deleteShoppingMallAdministratorProductCategoriesProductCategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.productCategoryId },
      select: { id: true },
    });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_products.updateMany({
      where: { product_subcategory_id: props.productCategoryId },
      data: { product_subcategory_id: undefined },
    });
    await prisma.shopping_mall_product_categories.delete({
      where: { id: props.productCategoryId },
    });
  });
}
