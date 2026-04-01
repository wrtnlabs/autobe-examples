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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSellers(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSeller.IRequest;
}): Promise<IPageIShoppingMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const statusFilter = props.body.status;
  const baseWhere: Prisma.shopping_mall_sellersWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      email: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.shopping_mall_sellersWhereInput;
  const orderByInput =
    props.body.sort === "email_ASC"
      ? { email: "asc" as const }
      : props.body.sort === "email_DESC"
        ? { email: "desc" as const }
        : { created_at: "desc" as const };
  const data = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: baseWhere,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      email: true,
      created_at: true,
      approvalRequests: {
        orderBy: { submitted_at: "desc" },
        take: 1,
        select: { status: true },
      } satisfies Prisma.shopping_mall_seller_approval_requestsFindManyArgs,
    },
  });
  const filteredData = statusFilter
    ? data.filter(
        (seller) =>
          (seller.approvalRequests[0]?.status ?? "pending") === statusFilter,
      )
    : data;
  const total = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: baseWhere,
  });
  const filteredTotal = statusFilter ? filteredData.length : total;
  return {
    data: filteredData.map((seller) => ({
      id: seller.id,
      email: seller.email,
      created_at: seller.created_at.toISOString(),
      approval_status: typia.assert<"pending" | "approved" | "rejected">(
        seller.approvalRequests[0]?.status ?? "pending",
      ),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: filteredTotal,
      pages: Math.ceil(filteredTotal / limit),
    } satisfies IPage.IPagination,
  };
}
