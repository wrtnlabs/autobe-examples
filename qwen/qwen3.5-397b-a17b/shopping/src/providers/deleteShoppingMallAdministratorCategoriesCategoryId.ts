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

export async function deleteShoppingMallAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify category exists and is not already deleted
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  // Soft delete the category and all descendants in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    async function deleteRecursive(categoryId: string): Promise<void> {
      const children = await tx.shopping_mall_categories.findMany({
        where: { parent_id: categoryId },
      });
      for (const child of children) {
        await deleteRecursive(child.id);
      }
      await tx.shopping_mall_categories.update({
        where: { id: categoryId },
        data: { deleted_at: new Date() },
      });
    }
    await deleteRecursive(props.categoryId);
  });
}
