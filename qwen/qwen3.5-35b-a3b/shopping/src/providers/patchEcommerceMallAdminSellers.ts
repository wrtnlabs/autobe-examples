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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.approvalStatus !== undefined && {
      approval_status: props.body.approvalStatus,
    }),
    ...(props.body.isSuspended !== undefined && {
      is_suspended: props.body.isSuspended,
    }),
    ...(props.body.isBanned !== undefined && {
      is_banned: props.body.isBanned,
    }),
    ...(props.body.createdAtMin !== undefined && {
      created_at: { gte: props.body.createdAtMin },
    }),
    ...(props.body.createdAtMax !== undefined && {
      created_at: { lte: props.body.createdAtMax },
    }),
    ...(props.body.updatedAtMin !== undefined && {
      updated_at: { gte: props.body.updatedAtMin },
    }),
    ...(props.body.updatedAtMax !== undefined && {
      updated_at: { lte: props.body.updatedAtMax },
    }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  const orderByInput = (() => {
    const sort = props.body.sort ?? "createdAt";
    const direction: "asc" | "desc" = "desc";
    switch (sort) {
      case "createdAt":
        return { created_at: direction };
      case "updatedAt":
        return { updated_at: direction };
      case "approvalStatus":
        return { approval_status: direction };
      default:
        return { created_at: direction };
    }
  })() satisfies Prisma.ecommerce_mall_sellersOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_sellers.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.count({ where: whereInput }),
  ]);
  const transformedData = await Promise.all(
    data.map((record) =>
      EcommerceMallSellerAtSummaryTransformer.transform(record),
    ),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
