import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemCacheTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemCacheTracking";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSystemCacheTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemCacheTracking";
import { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
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

export async function patchShoppingMallAdminCacheTrackings(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemCacheTracking.IRequest;
}): Promise<IPageIShoppingMallSystemCacheTracking.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.shopping_mall_system_cache_trackingsWhereInput = {};
  if (props.body.cache_key_pattern) {
    where.cache_key_pattern = {
      contains: props.body.cache_key_pattern,
      mode: Prisma.QueryMode.insensitive,
    };
  }
  if (props.body.table_name) {
    where.table_name = props.body.table_name;
  }
  if (props.body.created_at_from || props.body.created_at_to) {
    where.invalidated_at = {};
    if (props.body.created_at_from) {
      where.invalidated_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      where.invalidated_at.lte = props.body.created_at_to;
    }
  }
  // Query with admin relation (only relation available)
  const data =
    await MyGlobal.prisma.shopping_mall_system_cache_trackings.findMany({
      where,
      skip,
      take: limit,
      orderBy: { invalidated_at: "desc" },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_system_cache_trackings.count({
      where,
    });
  // Get unique table_name values for batch query
  const tableNames = Array.from(new Set(data.map((item) => item.table_name)));
  const referenceDataMap = new Map<
    string,
    IShoppingMallSystemReferenceData.ISummary
  >();
  if (tableNames.length > 0) {
    const referenceData =
      await MyGlobal.prisma.shopping_mall_system_reference_data.findMany({
        where: {
          id: { in: tableNames },
        },
      });
    referenceData.forEach((item) => {
      referenceDataMap.set(item.id, {
        id: item.id as string & tags.Format<"uuid">,
        name: item.name,
        value: item.value,
        label: item.label,
        description: item.description ?? null,
        sort_order: item.sort_order ?? null,
        is_active: item.is_active,
      } satisfies IShoppingMallSystemReferenceData.ISummary);
    });
  }
  // Transform to summary
  const transformed = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    cache_key_pattern: record.cache_key_pattern,
    description: record.description,
    invalidated_at: record.invalidated_at.toISOString(),
    table_name: referenceDataMap.get(record.table_name) || null,
    admin: record.admin
      ? {
          id: record.admin.id as string & tags.Format<"uuid">,
          email: record.admin.email,
          reason: "",
          status: "pending" as const,
          created_at:
            record.admin.created_at?.toISOString() ?? new Date().toISOString(),
          updated_at:
            record.admin.updated_at?.toISOString() ?? new Date().toISOString(),
        }
      : null,
  }));
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
