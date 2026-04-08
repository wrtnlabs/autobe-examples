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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerApprovalAtSummaryTransformer } from "../transformers/EcommerceSellerApprovalAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerApprovals(props: {
  seller: SellerPayload;
  body: IEcommerceSellerApproval.IRequest;
}): Promise<IPageIEcommerceSellerApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_seller_approvalsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined &&
            props.body.createdAtFrom !== null
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined &&
            props.body.createdAtTo !== null
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.reviewedAtFrom !== undefined ||
    props.body.reviewedAtTo !== undefined
      ? {
          reviewed_at: {
            ...(props.body.reviewedAtFrom !== undefined &&
            props.body.reviewedAtFrom !== null
              ? { gte: new Date(props.body.reviewedAtFrom) }
              : {}),
            ...(props.body.reviewedAtTo !== undefined &&
            props.body.reviewedAtTo !== null
              ? { lte: new Date(props.body.reviewedAtTo) }
              : {}),
          },
        }
      : {}),
  };
  const orderByInput: Prisma.ecommerce_seller_approvalsOrderByWithRelationInput =
    props.body.sortBy !== undefined && props.body.sortOrder !== undefined
      ? ({
          [props.body.sortBy]: props.body.sortOrder === "asc" ? "asc" : "desc",
        } satisfies Prisma.ecommerce_seller_approvalsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.ecommerce_seller_approvalsOrderByWithRelationInput);
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_seller_approvals.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceSellerApprovalAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_seller_approvals.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceSellerApprovalAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceSellerApproval.ISummary;
}
