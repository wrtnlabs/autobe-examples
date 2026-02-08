import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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

export async function putShoppingMallAdministratorProductCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  subcategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.IUpdate;
}): Promise<IShoppingMallProductSubcategory> {
  const { administrator, categoryId, subcategoryId, body } = props;
  const existingSubcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findFirst({
      where: {
        id: subcategoryId,
        shopping_mall_product_category_id: categoryId,
      },
    });
  if (!existingSubcategory) {
    throw new HttpException("Subcategory not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      category_id: existingSubcategory.shopping_mall_product_category_id,
      name: existingSubcategory.name,
      description: existingSubcategory.description ?? "",
      base_price: existingSubcategory.base_price ?? 0,
      product: {
        connect: { id: existingSubcategory.shopping_mall_product_category_id },
      },
      created_at: toISOStringSafe(existingSubcategory.created_at),
      updated_at: toISOStringSafe(existingSubcategory.updated_at),
    },
  });
  const updateData: {
    description?: string | Prisma.StringFieldUpdateOperationsInput;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("description" in body) {
    const desc = body.description;
    updateData.description = desc === undefined || desc === null ? "" : desc;
  }
  const updatedSubcategory =
    await MyGlobal.prisma.shopping_mall_product_subcategories.update({
      where: { id: subcategoryId },
      data: updateData,
    });
  return updatedSubcategory;
}
