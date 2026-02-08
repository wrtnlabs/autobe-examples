import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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

export async function patchShoppingMallAdministratorProductCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallProductCategory.IRequest;
}): Promise<IPageIShoppingMallProductCategory.ISummary> {
  const body = props.body as any;
  if (typeof body.id !== "string" || body.id.trim() === "") {
    throw new HttpException("Category ID is required.", 400);
  }
  const updateData: Prisma.shopping_mall_product_categoriesUpdateInput = {};
  if (typeof body.name === "string") {
    updateData.name = body.name;
  }
  if (typeof body.description === "string") {
    updateData.description = body.description;
  }
  await MyGlobal.prisma.shopping_mall_product_categories.update({
    where: { id: body.id },
    data: updateData,
  });
  const updatedCategory =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { id: body.id },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  if (!updatedCategory) {
    throw new HttpException("Category not found after update.", 404);
  }
  return {
    data: [
      {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
      },
    ],
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    },
  };
}
