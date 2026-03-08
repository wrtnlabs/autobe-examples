import { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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

export async function patchEconomicPoliticalBoardAdminAdministratorRequests(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardAdministratorRequest.IRequest;
}): Promise<IPageIEconomicPoliticalBoardAdministratorRequest.ISummary> {
  // Verify admin has super administrator grade
  const adminRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirstOrThrow(
      {
        where: {
          user_id: props.admin.id,
        },
        select: { grade: true },
      },
    );
  if (adminRole.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Build filter conditions
  const whereInput: Prisma.economic_political_board_administrator_requestsWhereInput =
    {
      status: props.body.status,
      user_id: props.body.userId,
      created_at: {
        ...(props.body.createdAtFrom && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
      reviewed_at: {
        ...(props.body.reviewedAtFrom && {
          gte: new Date(props.body.reviewedAtFrom),
        }),
        ...(props.body.reviewedAtTo && {
          lte: new Date(props.body.reviewedAtTo),
        }),
      },
      reason: props.body.search
        ? {
            contains: props.body.search,
            mode: "insensitive",
          }
        : undefined,
    } satisfies Prisma.economic_political_board_administrator_requestsWhereInput;
  // Build order by
  const orderByInput: Prisma.economic_political_board_administrator_requestsOrderByWithRelationInput =
    props.body.sort
      ? {
          created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
        }
      : {
          created_at: "desc",
        };
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  // Get paginated data
  const data =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findMany(
      {
        where: whereInput,
        orderBy: orderByInput,
        skip,
        take: limit,
        ...EconomicPoliticalBoardAdministratorRequestAtSummaryTransformer.select(),
      },
    );
  // Get total count
  const total =
    await MyGlobal.prisma.economic_political_board_administrator_requests.count(
      {
        where: whereInput,
      },
    );
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalBoardAdministratorRequestAtSummaryTransformer.transform,
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
