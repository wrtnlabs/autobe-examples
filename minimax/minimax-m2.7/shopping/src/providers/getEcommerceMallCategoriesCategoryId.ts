import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryAtInvertTransformer } from "../transformers/EcommerceMallCategoryAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCategory.IInvert> {
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      ...EcommerceMallCategoryAtInvertTransformer.select(),
    });
  return await EcommerceMallCategoryAtInvertTransformer.transform(category);
}
