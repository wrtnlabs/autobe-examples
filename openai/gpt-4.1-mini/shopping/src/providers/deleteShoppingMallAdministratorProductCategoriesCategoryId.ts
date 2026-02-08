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

export async function deleteShoppingMallAdministratorProductCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: props.categoryId },
    });
  if (!category) {
    throw new HttpException("Product category not found", 404);
  }
  const subcategoryCount =
    await MyGlobal.prisma.shopping_mall_product_subcategories.count({
      where: { shopping_mall_product_category_id: props.categoryId },
    });
  if (subcategoryCount > 0) {
    throw new HttpException(
      "Cannot delete category while subcategories exist",
      400,
    );
  }
  try {
    await MyGlobal.prisma.shopping_mall_product_categories.delete({
      where: { id: props.categoryId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpException(
        "Cannot delete category due to existing related records",
        400,
      );
    }
    throw error;
  }
}
