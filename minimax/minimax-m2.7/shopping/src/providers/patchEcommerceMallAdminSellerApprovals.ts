import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerApprovalAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellerApprovals(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerApproval.IRequest;
}): Promise<IPageIEcommerceMallSellerApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filters for created_at
  const createdAtRange =
    props.body.createdAtFrom || props.body.createdAtTo
      ? {
          ...(props.body.createdAtFrom !== undefined && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo !== undefined && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  // Build date range filters for updated_at (review timestamp)
  const reviewedAtRange =
    props.body.reviewedAtFrom || props.body.reviewedAtTo
      ? {
          ...(props.body.reviewedAtFrom !== undefined && {
            gte: new Date(props.body.reviewedAtFrom),
          }),
          ...(props.body.reviewedAtTo !== undefined && {
            lte: new Date(props.body.reviewedAtTo),
          }),
        }
      : undefined;
  // Build where clause
  const whereInput = {
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(createdAtRange !== undefined && { created_at: createdAtRange }),
    ...(reviewedAtRange !== undefined && { updated_at: reviewedAtRange }),
    ...(props.body.sellerEmail !== undefined && {
      seller: {
        email: {
          contains: props.body.sellerEmail,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.ecommerce_mall_seller_approvalsWhereInput;
  // Build orderBy clause
  const orderByInput = (
    props.body.sortBy === "status"
      ? { status: props.body.sortOrder ?? "desc" }
      : { created_at: props.body.sortOrder ?? "desc" }
  ) satisfies Prisma.ecommerce_mall_seller_approvalsOrderByWithRelationInput;
  // Execute findMany for data
  const data = await MyGlobal.prisma.ecommerce_mall_seller_approvals.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallSellerApprovalAtSummaryTransformer.select(),
  });
  // Execute count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_seller_approvals.count({
    where: whereInput,
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallSellerApprovalAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
