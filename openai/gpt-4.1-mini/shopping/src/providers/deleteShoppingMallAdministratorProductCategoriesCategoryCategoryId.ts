import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallAdministratorProductCategoriesCategoryCategoryId(props: {
  administrator: AdministratorPayload;
  categoryCategoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_product_subcategories.findUniqueOrThrow({
      where: { id: props.categoryCategoryId },
    });
    await tx.shopping_mall_products.updateMany({
      where: { product_subcategory_id: props.categoryCategoryId },
      data: { product_subcategory_id: null },
    });
    await tx.shopping_mall_product_subcategories.delete({
      where: { id: props.categoryCategoryId },
    });
  });
}
