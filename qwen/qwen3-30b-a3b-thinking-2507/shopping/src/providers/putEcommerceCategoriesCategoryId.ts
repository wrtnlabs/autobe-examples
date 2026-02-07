import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCategoryTransformer } from "../transformers/EcommerceCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceCategory.IUpdate;
}): Promise<IEcommerceCategory> {
  const category = await MyGlobal.prisma.ecommerce_categories.findUnique({
    where: { id: props.categoryId },
    ...EcommerceCategoryTransformer.select(),
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  const updateData = {} as any;
  if (props.body.name !== undefined && props.body.name !== category.name) {
    updateData.name = props.body.name;
    const existingCategory =
      await MyGlobal.prisma.ecommerce_categories.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.categoryId },
        },
      });
    if (existingCategory) {
      throw new HttpException(
        "Category name already exists at root level",
        400,
      );
    }
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  const updatedCategory = await MyGlobal.prisma.ecommerce_categories.update({
    where: { id: props.categoryId },
    data: updateData,
    ...EcommerceCategoryTransformer.select(),
  });
  return EcommerceCategoryTransformer.transform(updatedCategory);
}
