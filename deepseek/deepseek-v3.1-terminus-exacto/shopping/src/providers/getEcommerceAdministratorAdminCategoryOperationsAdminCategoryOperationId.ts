import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
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

export async function getEcommerceAdministratorAdminCategoryOperationsAdminCategoryOperationId(props: {
  administrator: AdministratorPayload;
  adminCategoryOperationId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCacheConfigurationParameterDefinition> {
  const operation =
    await MyGlobal.prisma.ecommerce_admin_category_operations.findUniqueOrThrow(
      {
        where: { id: props.adminCategoryOperationId },
        select: {
          id: true,
          operation_type: true,
          category_name_before: true,
          category_description_before: true,
          parent_category_id_before: true,
          category_name_after: true,
          category_description_after: true,
          parent_category_id_after: true,
          operation_details: true,
          created_at: true,
          administrator: {
            select: {
              id: true,
              email: true,
              created_at: true,
            },
          } satisfies Prisma.ecommerce_administratorsFindManyArgs,
          category: {
            select: {
              id: true,
              name: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  created_at: true,
                },
              } satisfies Prisma.ecommerce_categoriesFindManyArgs,
              created_at: true,
            },
          } satisfies Prisma.ecommerce_categoriesFindManyArgs,
        },
      },
    );
  return {
    id: operation.id,
    operation_type: operation.operation_type,
    category_name_before: operation.category_name_before ?? null,
    category_description_before: operation.category_description_before ?? null,
    parent_category_id_before: operation.parent_category_id_before ?? null,
    category_name_after: operation.category_name_after ?? null,
    category_description_after: operation.category_description_after ?? null,
    parent_category_id_after: operation.parent_category_id_after ?? null,
    operation_details: operation.operation_details ?? null,
    created_at: operation.created_at.toISOString(),
    administrator: {
      id: operation.administrator.id,
      email: operation.administrator.email,
      created_at: operation.administrator.created_at.toISOString(),
    } satisfies IEcommerceAdministrator.ISummary,
    category: {
      id: operation.category.id,
      name: operation.category.name,
      parent: operation.category.parent
        ? ({
            id: operation.category.parent.id,
            name: operation.category.parent.name,
            parent: null,
            products_count: 0,
            created_at: operation.category.parent.created_at.toISOString(),
          } satisfies IEcommerceCategory.ISummary)
        : null,
      products_count: 0,
      created_at: operation.category.created_at.toISOString(),
    } satisfies IEcommerceCategory.ISummary,
  };
}
