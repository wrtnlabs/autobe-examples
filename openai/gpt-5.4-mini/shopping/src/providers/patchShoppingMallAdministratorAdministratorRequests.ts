import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
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

export async function patchShoppingMallAdministratorAdministratorRequests(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorRequest.IRequest;
}): Promise<IPageIShoppingMallAdministratorRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 10;
  const skip: number = (page - 1) * limit;
  const status: string | null = props.body.status;
  const applicantType: string | null = props.body.applicantType;
  const keyword: string | null = props.body.keyword;
  const sort: string | null = props.body.sort;
  const order: string | null = props.body.order;
  if (
    applicantType !== null &&
    applicantType !== "customer" &&
    applicantType !== "seller"
  ) {
    throw new HttpException("Invalid applicantType", 400);
  }
  const where: Prisma.shopping_mall_administrator_requestsWhereInput = {
    ...(status !== null ? { status } : {}),
    ...(keyword !== null
      ? {
          OR: [
            { reason: { contains: keyword, mode: "insensitive" } },
            { rejected_reason: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy = (
    sort === "status"
      ? [{ status: order === "asc" ? "asc" : "desc" }, { id: "desc" }]
      : sort === "reason"
        ? [{ reason: order === "asc" ? "asc" : "desc" }, { id: "desc" }]
        : sort === "updated_at"
          ? [{ updated_at: order === "asc" ? "asc" : "desc" }, { id: "desc" }]
          : [{ created_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.shopping_mall_administrator_requestsOrderByWithRelationInput[];
  const data =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        reason: true,
        status: true,
        rejected_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const records =
    await MyGlobal.prisma.shopping_mall_administrator_requests.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      reason: row.reason,
      status: row.status,
      rejected_reason: row.rejected_reason,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    })),
  };
}
