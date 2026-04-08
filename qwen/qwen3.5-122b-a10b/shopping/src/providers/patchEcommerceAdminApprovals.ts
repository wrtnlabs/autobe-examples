import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceSellerApprovalAtSummaryTransformer } from "../transformers/EcommerceSellerApprovalAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminApprovals(props: {
  admin: AdminPayload;
  body: IEcommerceSellerApproval.IRequest;
}): Promise<IPageIEcommerceSellerApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.reviewedAtFrom !== undefined &&
      props.body.reviewedAtFrom !== null && {
        reviewed_at: { gte: new Date(props.body.reviewedAtFrom) },
      }),
    ...(props.body.reviewedAtTo !== undefined &&
      props.body.reviewedAtTo !== null && {
        reviewed_at: { lte: new Date(props.body.reviewedAtTo) },
      }),
  } satisfies Prisma.ecommerce_seller_approvalsWhereInput;
  const orderByInput =
    props.body.sortBy && props.body.sortOrder
      ? {
          [props.body.sortBy]:
            props.body.sortOrder === "asc"
              ? Prisma.SortOrder.asc
              : Prisma.SortOrder.desc,
        }
      : { created_at: Prisma.SortOrder.desc };
  const records = await MyGlobal.prisma.ecommerce_seller_approvals.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceSellerApprovalAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_seller_approvals.count({
    where: whereInput,
  });
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceSellerApprovalAtSummaryTransformer.transform,
  );
  return {
    pagination,
    data,
  } satisfies IPageIEcommerceSellerApproval.ISummary;
}
