import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCategoriesCategoryIdSubcategories(props: {
  categoryId: string;
  body: IShoppingMallSubcategory.IUpdate;
}): Promise<IShoppingMallSubcategory> {
  // IShoppingMallSubcategory.IUpdate is empty, so we cannot access body properties
  // This is a limitation of the DTO definition
  throw new HttpException("Not implemented: IUpdate DTO is empty", 501);
}
