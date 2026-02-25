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

export async function putShoppingMallAdministratorProductCategoriesCategoryCategoryId(props: {
  administrator: AdministratorPayload;
  categoryCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductCategory.IUpdate;
}): Promise<IShoppingMallProductCategory> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Verify category exists
  await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
    where: { id: props.categoryCategoryId },
    select: { id: true },
  });
  // Ensure name is unique among active categories except current
  const existing =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        NOT: { id: props.categoryCategoryId },
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Category name must be unique", 409);
  }
  // Perform update
  await MyGlobal.prisma.shopping_mall_product_categories.update({
    where: { id: props.categoryCategoryId },
    data: {
      name: props.body.name,
      description: props.body.description,
      updated_at: now,
    },
  });
  // Log admin action
  await MyGlobal.prisma.shopping_mall_administrative_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      administrator_id: props.administrator.id,
      action_data: now,
      action_type: "UPDATE",
      target_id: props.categoryCategoryId,
      target_entity: "shopping_mall_product_categories",
      action_description: `Updated product category name to ${props.body.name}`,
      created_at: now,
      updated_at: now,
    },
  });
  // Fetch updated category
  const updated =
    await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
      where: { id: props.categoryCategoryId },
      ...ShoppingMallProductCategoryTransformer.select(),
    });
  return await ShoppingMallProductCategoryTransformer.transform(updated);
}
