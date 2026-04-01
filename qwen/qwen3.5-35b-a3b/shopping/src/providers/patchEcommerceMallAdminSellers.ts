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
  const page = props.body.page;
  const limit = props.body.limit ?? 100;
  // Build where clause for filtering
  const whereInput: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: null,
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.status && {
      approvalRequests: {
        some: {
          status: props.body.status,
        },
      },
    }),
    ...(props.body.createdAfter && {
      created_at: {
        gte: new Date(props.body.createdAfter),
      },
    }),
    ...(props.body.createdBefore && {
      created_at: {
        lte: new Date(props.body.createdBefore),
      },
    }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  // Build orderBy clause
  const orderByInput: Prisma.ecommerce_mall_sellersOrderByWithRelationInput[] =
    [
      {
        ...(props.body.sortBy === "email"
          ? { email: props.body.sortOrder === "asc" ? "asc" : "desc" }
          : props.body.sortBy === "createdAt"
            ? { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
            : props.body.sortBy === "status"
              ? { created_at: "desc" }
              : { created_at: "desc" }),
      },
    ] satisfies Prisma.ecommerce_mall_sellersOrderByWithRelationInput[];
  // Handle cursor pagination
  let skip: number | undefined;
  if (page) {
    skip = 1;
    whereInput.id = {
      gte: page,
    };
  }
  const data = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereInput,
  });
  const nextCursor =
    data.length === limit ? data[data.length - 1].id : undefined;
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page ? parseInt(page, 10) : 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
