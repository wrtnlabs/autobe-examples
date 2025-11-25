import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallNotificationsTemplates(props: {
  body: IShoppingMallNotificationTemplate.IRequest;
}): Promise<IPageIShoppingMallNotificationTemplate.ISummary> {
  const {
    page,
    limit,
    search,
    type,
    language,
    active,
    sortBy = "created_at",
    order = "desc",
  } = props.body;

  // Build dynamic where condition with proper null/undefined handling
  const where: Record<string, any> = {};

  // Search across title, subject, and body
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  // Filter by type
  if (type) {
    where.type = type;
  }

  // Filter by language
  if (language) {
    where.language = language;
  }

  // Filter by active status
  if (active !== undefined) {
    where.active = active;
  }

  // Ensure we only return non-deleted templates
  where.deleted_at = null;

  // Determine sort field and order
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (sortBy) {
    orderBy[sortBy] = order === "desc" ? "desc" : "asc";
  } else {
    orderBy.created_at = "desc";
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries with inline Prisma parameters (no intermediate variables)
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_notification_templates.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_notification_templates.count({ where }),
  ]);

  // Return properly typed response with ISO date strings
  // Note: IShoppingMallNotificationTemplate.ISummary is defined as string in the DTO
  // This means the API expects string IDs, not full objects
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((template) => template.id),
  };
}
