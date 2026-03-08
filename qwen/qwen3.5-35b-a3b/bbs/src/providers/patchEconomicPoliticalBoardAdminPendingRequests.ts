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

export async function patchEconomicPoliticalBoardAdminPendingRequests(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardAdministratorRequest.IRequest;
}): Promise<IPageIEconomicPoliticalBoardAdministratorRequest.ISummary> {
  const admin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { user_id: props.admin.id },
        select: { grade: true },
      },
    );
  if (admin === null || admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  if (page < 1) {
    throw new HttpException("Invalid page number", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException(
      "Invalid page size. Must be between 1 and 100",
      400,
    );
  }
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economic_political_board_administrator_requestsWhereInput =
    {
      status: "pending",
      ...(props.body.userId !== undefined && {
        user_id: props.body.userId,
      }),
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo !== undefined && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
      ...(props.body.search !== undefined && {
        reason: {
          contains: props.body.search,
          mode: "insensitive",
        },
      }),
    } satisfies Prisma.economic_political_board_administrator_requestsWhereInput;
  const sortOrder: Prisma.SortOrder =
    props.body.sortOrder === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.economic_political_board_administrator_requestsOrderByWithRelationInput[] =
    props.body.sort !== undefined
      ? (() => {
          const condition =
            props.body.sort === "createdAt"
              ? ({
                  created_at: sortOrder,
                } satisfies Prisma.economic_political_board_administrator_requestsOrderByWithRelationInput)
              : props.body.sort === "reason"
                ? ({
                    reason: sortOrder,
                  } satisfies Prisma.economic_political_board_administrator_requestsOrderByWithRelationInput)
                : props.body.sort === "userId"
                  ? ({
                      user_id: sortOrder,
                    } satisfies Prisma.economic_political_board_administrator_requestsOrderByWithRelationInput)
                  : undefined;
          return condition !== undefined
            ? [condition]
            : [{ created_at: "desc" satisfies Prisma.SortOrder }];
        })()
      : [{ created_at: "desc" }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_administrator_requests.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EconomicPoliticalBoardAdministratorRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.economic_political_board_administrator_requests.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(data, (item) =>
      EconomicPoliticalBoardAdministratorRequestAtSummaryTransformer.transform(
        item,
      ),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
