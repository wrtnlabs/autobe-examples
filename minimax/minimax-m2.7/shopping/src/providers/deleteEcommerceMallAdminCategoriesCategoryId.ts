import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Validate the category exists and is not already deleted
    const category = await tx.ecommerce_mall_categories.findFirst({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
    });
    if (!category) {
      throw new HttpException("Category not found or already deleted", 404);
    }
    // 2. Find all subcategories of the target category
    const subcategories = await tx.ecommerce_mall_categories.findMany({
      where: {
        parent_id: props.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const subcategoryIds = subcategories.map((sub) => sub.id);
    // 3. Set category_id to null for all products assigned to this category
    await tx.ecommerce_mall_products.updateMany({
      where: {
        ecommerce_mall_category_id: props.categoryId,
      },
      data: {
        ecommerce_mall_category_id: null as unknown as string,
        updated_at: now,
      },
    });
    // 4. Set category_id to null for products in subcategories (if any)
    if (subcategoryIds.length > 0) {
      await tx.ecommerce_mall_products.updateMany({
        where: {
          ecommerce_mall_category_id: {
            in: subcategoryIds,
          },
        },
        data: {
          ecommerce_mall_category_id: null as unknown as string,
          updated_at: now,
        },
      });
    }
    // 5. Soft delete all subcategories
    if (subcategoryIds.length > 0) {
      await tx.ecommerce_mall_categories.updateMany({
        where: {
          id: {
            in: subcategoryIds,
          },
        },
        data: {
          deleted_at: now,
        },
      });
    }
    // 6. Soft delete the target category
    await tx.ecommerce_mall_categories.update({
      where: {
        id: props.categoryId,
      },
      data: {
        deleted_at: now,
      },
    });
  });
}
