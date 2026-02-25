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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEcommerceAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if category exists and is not already deleted
  const category = await MyGlobal.prisma.ecommerce_categories.findFirst({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Category not found or already deleted", 404);
  }
  // Check if category has active subcategories
  const subcategories = await MyGlobal.prisma.ecommerce_categories.findMany({
    where: {
      parent_category_id: props.categoryId,
      deleted_at: null,
    },
  });
  if (subcategories.length > 0) {
    throw new HttpException(
      "Cannot delete category with active subcategories",
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  try {
    // Start transaction for atomic operations
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update products to disconnect category relationship
      await tx.ecommerce_products.updateMany({
        where: {
          ecommerce_category_id: props.categoryId,
          deleted_at: null,
        },
        data: {
          ecommerce_category_id: undefined,
          updated_at: now,
        },
      });
      // Soft delete the category
      await tx.ecommerce_categories.update({
        where: {
          id: props.categoryId,
        },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
      // Create audit log entry
      await tx.ecommerce_audit_logs.create({
        data: {
          id: v4(),
          event_type: "administrative_action",
          event_subtype: "category_deletion",
          severity: "info",
          administrator_id: props.administrator.id,
          resource_type: "category",
          resource_id: props.categoryId,
          action_description: `Category "${category.name}" deleted by administrator`,
          context_data: JSON.stringify({
            category_name: category.name,
            products_reassigned: true,
          }),
          success: true,
          created_at: now,
        },
      });
    });
  } catch (error) {
    throw new HttpException("Failed to delete category", 500);
  }
}
