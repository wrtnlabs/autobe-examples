import { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardAdministratorRequestAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminRequests(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardAdministratorRequest.IRequest;
}): Promise<IPageIEconomicPoliticalBoardAdministratorRequest.ISummary> {
  // Validate super administrator privileges
  const administrator =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { user_id: props.admin.id },
      },
    );
  if (administrator === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (administrator.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with pending status filter and optional date range
  const whereInput: Prisma.economic_political_board_administrator_requestsWhereInput =
    {
      status: "pending",
      ...(props.body.startDate && {
        created_at: {
          gte: new Date(props.body.startDate + "T00:00:00Z"),
        },
      }),
      ...(props.body.endDate && {
        created_at: {
          lte: new Date(props.body.endDate + "T23:59:59Z"),
        },
      }),
    } satisfies Prisma.economic_political_board_administrator_requestsWhereInput;
  // Build ORDER BY clause
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.economic_political_board_administrator_requestsOrderByWithRelationInput =
    {
      created_at: sortOrder,
    } satisfies Prisma.economic_political_board_administrator_requestsOrderByWithRelationInput;
  // Query pending requests with user and reviewedByAdmin relations
  const data =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        include: { user: true, reviewedByAdmin: true },
      },
    );
  // Count total records for pagination metadata
  const total =
    await MyGlobal.prisma.economic_political_board_administrator_requests.count(
      {
        where: whereInput,
      },
    );
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(data, async (request) => {
    const transformed =
      await EconomicPoliticalBoardAdministratorRequestAtSummaryTransformer.transform(
        request,
      );
    return {
      id: transformed.id,
      reason: transformed.reason,
      status: transformed.status,
      created_at: toISOStringSafe(transformed.created_at),
      user_id: transformed.user_id,
    } satisfies IEconomicPoliticalBoardAdministratorRequest.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEconomicPoliticalBoardAdministratorRequest.ISummary;
}
