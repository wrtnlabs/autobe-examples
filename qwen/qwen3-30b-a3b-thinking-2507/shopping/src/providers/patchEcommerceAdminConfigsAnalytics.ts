import { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemConfig";
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

export async function patchEcommerceAdminConfigsAnalytics(props: {
  admin: AdminPayload;
  body: IEcommerceSystemConfig.IRequest;
}): Promise<IPageIEcommerceSystemConfig.ISummary> {
  const {
    search,
    key,
    created_at_min,
    created_at_max,
    page = 1,
    limit = 10,
  } = props.body;
  // Validate date range (max 30 days)
  if (created_at_min && created_at_max) {
    const minDate = new Date(created_at_min);
    const maxDate = new Date(created_at_max);
    const diffInDays = Math.ceil(
      (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffInDays > 30) {
      throw new HttpException("Date range cannot exceed 30 days", 400);
    }
  }
  // Build WHERE filter
  const conditions = [
    key ? { key: { contains: key, mode: "insensitive" } } : undefined,
    search
      ? { description: { contains: search, mode: "insensitive" } }
      : undefined,
    created_at_min ? { created_at: { gte: created_at_min } } : undefined,
    created_at_max ? { created_at: { lte: created_at_max } } : undefined,
  ].filter(Boolean);
  const where = conditions.length > 0 ? { AND: conditions } : {};
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.ecommerce_system_configs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      key: true,
      description: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_system_configs.count({
    where,
  });
  // Transform the data to ISummary format
  const summaries = data.map((item) => ({
    id: item.id,
    key: item.key,
    description: item.description,
    created_at: toISOStringSafe(item.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaries,
  };
}
