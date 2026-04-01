import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallSuperAdministratorSellers(props: {
  superAdministrator: SuperadministratorPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause for soft-delete filter
  const whereClause: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
  };
  // Apply email search filter (partial match)
  if (props.body.search !== undefined) {
    whereClause.email = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Apply date range filters
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_from !== undefined) {
      dateFilter.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      dateFilter.lte = new Date(props.body.created_at_to);
    }
    whereClause.created_at = dateFilter;
  }
  // Get sellers with pagination and sorting
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy:
      props.body.sort === "email_ASC"
        ? { email: "asc" }
        : props.body.sort === "email_DESC"
          ? { email: "desc" }
          : { created_at: "desc" },
    select: {
      id: true,
      email: true,
      created_at: true,
      approvalRequests: {
        where: {
          deleted_at: null,
        },
        orderBy: {
          submitted_at: "desc",
        },
        take: 1,
        select: {
          status: true,
        },
      },
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: whereClause,
  });
  // Transform results
  const data: IShoppingMallSeller.ISummary[] = sellers.map((seller) => {
    const latestStatus = seller.approvalRequests[0]?.status;
    const approvalStatus: "pending" | "approved" | "rejected" =
      latestStatus !== undefined
        ? (latestStatus as "pending" | "approved" | "rejected")
        : "pending";
    return {
      id: seller.id,
      email: seller.email,
      created_at: seller.created_at.toISOString(),
      approval_status: approvalStatus,
    } satisfies IShoppingMallSeller.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
