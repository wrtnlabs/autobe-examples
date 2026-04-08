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

export async function patchEcommerceMallAdminArchivedSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IArchiveRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: { not: null },
    ...(props.body.deletedAtFrom !== undefined && {
      deleted_at: { gte: new Date(props.body.deletedAtFrom) },
    }),
    ...(props.body.deletedAtTo !== undefined && {
      deleted_at: { lte: new Date(props.body.deletedAtTo) },
    }),
    ...(props.body.approvalStatus !== undefined && {
      approval_status: props.body.approvalStatus,
    }),
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email },
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { deleted_at: "desc" },
    ...EcommerceMallSellerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
