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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorMetadataRegistries(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMetadataRegistry.IRequest;
}): Promise<IPageIEcommerceMetadataRegistry.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause without using Date objects
  const whereInput = {
    ...(props.body.schema_name !== undefined && {
      schema_name: {
        contains: props.body.schema_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.schema_version !== undefined && {
      schema_version: props.body.schema_version,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: props.body.created_before },
    }),
  } satisfies Prisma.ecommerce_metadata_registriesWhereInput;
  // Sequential queries for better error handling
  const data = await MyGlobal.prisma.ecommerce_metadata_registries.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    } as const satisfies Prisma.ecommerce_metadata_registriesOrderByWithRelationInput,
    select: {
      id: true,
      schema_name: true,
      schema_version: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_metadata_registries.count({
    where: whereInput,
  });
  // Use regular map since we're not calling async functions
  const transformedData = data.map((registry) => ({
    id: registry.id as string & tags.Format<"uuid">,
    schema_name: registry.schema_name,
    schema_version: registry.schema_version,
    is_active: registry.is_active,
    created_at: registry.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: registry.updated_at.toISOString() as string &
      tags.Format<"date-time">,
  }));
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
