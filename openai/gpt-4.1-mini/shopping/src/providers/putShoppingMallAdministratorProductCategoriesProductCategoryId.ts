import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductCategoryTransformer } from "../transformers/ShoppingMallProductCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorProductCategoriesProductCategoryId(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.IUpdate;
}): Promise<IShoppingMallProductCategory> {
  const now = new Date().toISOString();
  if (typeof now !== "string") {
    throw new Error("Failed to generate date-time string");
  }
  const updated = await MyGlobal.prisma.shopping_mall_product_categories.update(
    {
      where: { id: props.productCategoryId },
      data: {
        name: props.body.name,
        description: props.body.description,
        updated_at: now,
      },
      ...ShoppingMallProductCategoryTransformer.select(),
    },
  );
  return await ShoppingMallProductCategoryTransformer.transform(updated);
}
