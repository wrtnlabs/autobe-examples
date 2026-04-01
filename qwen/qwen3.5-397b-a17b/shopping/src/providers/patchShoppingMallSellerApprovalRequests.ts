import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerApprovalRequestAtSummaryTransformer } from "../transformers/ShoppingMallSellerApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerApprovalRequest.IRequest;
}): Promise<IPageIShoppingMallSellerApprovalRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.submitted_from && {
      submitted_at: { gte: new Date(props.body.submitted_from) },
    }),
    ...(props.body.submitted_to && {
      submitted_at: { lte: new Date(props.body.submitted_to) },
    }),
    ...(props.body.search && {
      seller: {
        email: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    }),
  } satisfies Prisma.shopping_mall_seller_approval_requestsWhereInput;
  const sortField = props.body.sort ?? "submitted_at";
  const direction = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.shopping_mall_seller_approval_requestsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_approval_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallSellerApprovalRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_seller_approval_requests.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerApprovalRequestAtSummaryTransformer.transform,
    ),
  };
}
