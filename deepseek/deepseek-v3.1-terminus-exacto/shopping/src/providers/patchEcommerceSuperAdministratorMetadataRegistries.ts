import { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorMetadataRegistries(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMetadataRegistry.IRequest;
}): Promise<IPageIEcommerceMetadataRegistry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Initialize whereInput with proper structure including date fields
  const whereInput: Prisma.ecommerce_metadata_registriesWhereInput = {};
  // Add conditional filters
  if (props.body.schema_name) {
    whereInput.schema_name = { contains: props.body.schema_name };
  }
  if (props.body.schema_version) {
    whereInput.schema_version = props.body.schema_version;
  }
  if (props.body.is_active !== undefined) {
    whereInput.is_active = props.body.is_active;
  }
  // Handle date filters properly with separate created_at object
  if (props.body.created_after || props.body.created_before) {
    whereInput.created_at = {};
    if (props.body.created_after) {
      const date = new Date(props.body.created_after);
      whereInput.created_at.gte = date;
    }
    if (props.body.created_before) {
      const date = new Date(props.body.created_before);
      whereInput.created_at.lte = date;
    }
  }
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_metadata_registries.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        schema_name: true,
        schema_version: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ecommerce_metadata_registries.count({
      where: whereInput,
    }),
  ]);
  // Transform results using toISOStringSafe instead of toISOString
  const transformedData = data.map(
    (record) =>
      ({
        id: record.id,
        schema_name: record.schema_name,
        schema_version: record.schema_version,
        is_active: record.is_active,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
      }) satisfies IEcommerceMetadataRegistry.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
