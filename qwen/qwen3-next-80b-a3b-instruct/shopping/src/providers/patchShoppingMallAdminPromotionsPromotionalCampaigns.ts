import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";
import { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPromotionsPromotionalCampaigns(props: {
  admin: AdminPayload;
  body: IShoppingMallPromotionalCampaign.IRequest;
}): Promise<IPageIShoppingMallPromotionalCampaign.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build WHERE condition based on request filters
  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
  };

  // Status filter
  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  // Search filter - matches name or description
  if (props.body.search) {
    whereCondition.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Budget filters
  if (
    props.body.min_budget !== undefined ||
    props.body.max_budget !== undefined
  ) {
    const budgetFilter: Record<string, number> = {};
    if (props.body.min_budget !== undefined) {
      budgetFilter["gte"] = props.body.min_budget;
    }
    if (props.body.max_budget !== undefined) {
      budgetFilter["lte"] = props.body.max_budget;
    }
    whereCondition.total_budget = budgetFilter;
  }

  // Date filters
  if (props.body.min_date !== undefined || props.body.max_date !== undefined) {
    const createdAtFilter: Record<string, string> = {};
    if (props.body.min_date !== undefined) {
      createdAtFilter["gte"] = toISOStringSafe(props.body.min_date);
    }
    if (props.body.max_date !== undefined) {
      createdAtFilter["lte"] = toISOStringSafe(props.body.max_date);
    }
    whereCondition.created_at = createdAtFilter;
  }

  if (
    props.body.start_date !== undefined ||
    props.body.end_date !== undefined
  ) {
    const startDateFilter: Record<string, string> = {};
    if (props.body.start_date !== undefined) {
      startDateFilter["gte"] = toISOStringSafe(props.body.start_date);
    }
    if (props.body.end_date !== undefined) {
      startDateFilter["lte"] = toISOStringSafe(props.body.end_date);
    }
    whereCondition.start_date = startDateFilter;
  }

  if (props.body.end_date !== undefined) {
    const endDateFilter: Record<string, string> = {};
    endDateFilter["lte"] = toISOStringSafe(props.body.end_date);
    whereCondition.end_date = endDateFilter;
  }

  // Sorting
  const orderBy: Record<string, unknown> = {};
  if (props.body.sort_by === "name") {
    orderBy.name = props.body.order ?? "asc";
  } else if (props.body.sort_by === "start_date") {
    orderBy.start_date = props.body.order ?? "asc";
  } else if (props.body.sort_by === "end_date") {
    orderBy.end_date = props.body.order ?? "asc";
  } else if (props.body.sort_by === "total_budget") {
    orderBy.total_budget = props.body.order ?? "asc";
  } else if (props.body.sort_by === "used_budget") {
    orderBy.used_budget = props.body.order ?? "asc";
  } else {
    orderBy.created_at = props.body.order ?? "desc";
  }

  // Execute queries
  const [campaigns, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_promotional_campaigns.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_promotional_campaigns.count({
      where: whereCondition,
    }),
  ]);

  // Convert to summary format (string type as per ISummary)
  const summaries = campaigns.map((campaign) => campaign.name);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaries,
  };
}
