import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationParameterDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer } from "../transformers/EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAdminCategoryOperations(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCacheConfigurationParameterDefinition.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationParameterDefinition.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions with proper date handling
  const whereConditions: Prisma.ecommerce_admin_category_operationsWhereInput =
    {
      // 移除了不存在的deleted_at属性
      ...(props.body.operation_type && {
        operation_type: props.body.operation_type,
      }),
      ...(props.body.administrator_id && {
        administrator_id: props.body.administrator_id,
      }),
      ...(props.body.category_id && { category_id: props.body.category_id }),
    };
  // Handle date range filtering with proper string to Date conversion for Prisma
  if (props.body.created_at_from || props.body.created_at_to) {
    const created_at: Prisma.DateTimeFilter = {};
    if (props.body.created_at_from) {
      // Validate and convert ISO string to Date for Prisma
      created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to) {
      // Validate and convert ISO string to Date for Prisma
      created_at.lte = new Date(props.body.created_at_to);
    }
    whereConditions.created_at = created_at;
  }
  // Handle full-text search
  if (props.body.search) {
    whereConditions.operation_details = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  // Query data with pagination
  const data =
    await MyGlobal.prisma.ecommerce_admin_category_operations.findMany({
      where:
        whereConditions satisfies Prisma.ecommerce_admin_category_operationsWhereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_admin_category_operations.count(
    {
      where:
        whereConditions satisfies Prisma.ecommerce_admin_category_operationsWhereInput,
    },
  );
  // Transform data using transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceCacheConfigurationParameterDefinitionAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
