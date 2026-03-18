import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalRequestAtSummaryTransformer } from "../transformers/ShoppingMallSellerApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSellerApprovalRequests(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSellerApprovalRequest.IRequest;
}): Promise<IPageIShoppingMallSellerApprovalRequest.ISummary> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.shopping_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== null ? { status: props.body.status } : {}),
    ...(props.body.shoppingMallSellerId !== null
      ? { shopping_mall_seller_id: props.body.shoppingMallSellerId }
      : {}),
    ...(props.body.rejectionReason !== null
      ? { rejection_reason: { contains: props.body.rejectionReason } }
      : {}),
    ...(props.body.createdAtFrom !== null || props.body.createdAtTo !== null
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== null
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== null
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
    ...(props.body.updatedAtFrom !== null || props.body.updatedAtTo !== null
      ? {
          updated_at: {
            ...(props.body.updatedAtFrom !== null
              ? { gte: props.body.updatedAtFrom }
              : {}),
            ...(props.body.updatedAtTo !== null
              ? { lte: props.body.updatedAtTo }
              : {}),
          },
        }
      : {}),
  };
  const orderBy =
    props.body.sort === null || props.body.sort === "newest"
      ? ([
          { created_at: "desc" },
          { id: "desc" },
        ] satisfies Prisma.shopping_mall_seller_approval_requestsOrderByWithRelationInput[])
      : props.body.sort === "oldest"
        ? ([
            { created_at: "asc" },
            { id: "asc" },
          ] satisfies Prisma.shopping_mall_seller_approval_requestsOrderByWithRelationInput[])
        : ([
            { created_at: "desc" },
            { id: "desc" },
          ] satisfies Prisma.shopping_mall_seller_approval_requestsOrderByWithRelationInput[]);
  const rows =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...ShoppingMallSellerApprovalRequestAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallSellerApprovalRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
