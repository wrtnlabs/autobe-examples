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

export async function putShoppingMallAdministratorProductSubcategoriesSubcategoryId(props: {
  administrator: AdministratorPayload;
  subcategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.IUpdate;
}): Promise<IShoppingMallProductSubcategory> {
  // Due to empty DTO schema for IUpdate, unable to proceed.
  throw new Error(
    "IShoppingMallProductSubcategory.IUpdate DTO is empty; please provide the exact shape for update.",
  );
}
