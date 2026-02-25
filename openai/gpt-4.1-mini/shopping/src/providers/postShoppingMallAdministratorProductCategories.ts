import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductCategoryCollector } from "../collectors/ShoppingMallProductCategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductCategoryTransformer } from "../transformers/ShoppingMallProductCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorProductCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallProductCategory.ICreate;
}): Promise<IShoppingMallProductCategory> {
  try {
    // Create raw record from DB (contains Dates)
    const createdRaw =
      await MyGlobal.prisma.shopping_mall_product_categories.create({
        data: await ShoppingMallProductCategoryCollector.collect({
          body: props.body,
        }),
        ...ShoppingMallProductCategoryTransformer.select(),
      });
    // Return transformed object (transform will handle Date to string conversion correctly)
    return await ShoppingMallProductCategoryTransformer.transform(createdRaw);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (Array.isArray(error.meta?.target)
        ? error.meta.target.includes("name")
        : typeof error.meta?.target === "string"
          ? error.meta.target.includes("name")
          : false)
    ) {
      throw new HttpException("Duplicate category name", 409);
    }
    throw error;
  }
}
