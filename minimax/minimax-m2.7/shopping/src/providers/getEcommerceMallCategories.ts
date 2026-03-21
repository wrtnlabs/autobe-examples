import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCategories(): Promise<IEcommerceMallCategory> {
  const categories = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: {
      parent_id: null,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
    ...EcommerceMallCategoryTransformer.select(),
  });
  return await EcommerceMallCategoryTransformer.transform(categories[0]);
}
