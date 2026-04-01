import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerApprovalRequestAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallSellerApprovalRequest.IRequest;
}): Promise<IPageIEcommerceMallSellerApprovalRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const offset = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.created_after !== undefined && {
      created_at: { gt: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lt: new Date(props.body.created_before) },
    }),
    ...(props.body.updated_after !== undefined && {
      updated_at: { gt: new Date(props.body.updated_after) },
    }),
    ...(props.body.updated_before !== undefined && {
      updated_at: { lt: new Date(props.body.updated_before) },
    }),
  } satisfies Prisma.ecommerce_mall_seller_approval_requestsWhereInput;
  const orderByInput = (
    props.body.sortBy === "created_at"
      ? { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
      : props.body.sortBy === "updated_at"
        ? { updated_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
        : { status: props.body.sortOrder === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.ecommerce_mall_seller_approval_requestsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip: offset,
      take: limit,
      ...EcommerceMallSellerApprovalRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_approval_requests.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSellerApprovalRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallSellerApprovalRequest.ISummary;
}
