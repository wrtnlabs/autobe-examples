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

export async function deleteEcommerceCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCategory> {
  const updatedCategory = await MyGlobal.prisma.ecommerce_categories.update({
    where: { id: props.categoryId },
    data: { deleted_at: toISOStringSafe(new Date()) },
    ...EcommerceCategoryTransformer.select(),
  });
  if (!updatedCategory) {
    throw new HttpException("Category not found", 404);
  }
  return EcommerceCategoryTransformer.transform(updatedCategory);
}
