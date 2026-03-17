import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const limit = props.body.limit ?? 100;
  const page = props.body.page ?? "0";
  const skip = page === "0" ? 0 : parseInt(page, 10);
  const where: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: null,
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.createdAfter && {
      created_at: { gte: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore && {
      created_at: { lte: new Date(props.body.createdBefore) },
    }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  const orderBy: Prisma.ecommerce_mall_sellersOrderByWithRelationInput[] = [];
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  if (sortBy === "email") {
    orderBy.push({ email: sortOrder as "asc" | "desc" });
  } else if (sortBy === "createdAt") {
    orderBy.push({ created_at: sortOrder as "asc" | "desc" });
  }
  const data = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...EcommerceMallSellerAtSummaryTransformer.select(),
  });
  let filteredData = data;
  if (props.body.status) {
    filteredData = data.filter((seller) => {
      const latestApproval =
        seller.approvalRequests.length > 0
          ? [...seller.approvalRequests].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )[0]
          : null;
      const computedStatus = latestApproval
        ? (latestApproval.status as "pending" | "approved" | "rejected")
        : "pending";
      return computedStatus === props.body.status;
    });
  }
  // Sort in memory for status sortBy since it's computed
  if (sortBy === "status") {
    filteredData = filteredData.sort((a, b) => {
      const getStatus = (seller: (typeof data)[0]) => {
        const latestApproval =
          seller.approvalRequests.length > 0
            ? [...seller.approvalRequests].sort(
                (x, y) =>
                  new Date(y.created_at).getTime() -
                  new Date(x.created_at).getTime(),
              )[0]
            : null;
        return latestApproval
          ? (latestApproval.status as "pending" | "approved" | "rejected")
          : "pending";
      };
      const statusA = getStatus(a);
      const statusB = getStatus(b);
      const order = sortOrder === "asc" ? 1 : -1;
      const statusOrder: Record<string, number> = {
        approved: 1,
        pending: 2,
        rejected: 3,
      };
      return (statusOrder[statusA] - statusOrder[statusB]) * order;
    });
  }
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      filteredData,
      EcommerceMallSellerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: skip + 1,
      limit,
      records: filteredData.length,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
