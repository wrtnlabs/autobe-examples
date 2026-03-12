import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
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

export async function patchShoppingMallSellerSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerApprovalRequest.IRequest;
}): Promise<IPageIShoppingMallSellerApprovalRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.submittedAfter !== undefined && {
      submitted_at: { gte: new Date(props.body.submittedAfter) },
    }),
    ...(props.body.submittedBefore !== undefined && {
      submitted_at: {
        lte: new Date(props.body.submittedBefore),
        ...(props.body.submittedAfter !== undefined && {
          gte: new Date(props.body.submittedAfter),
        }),
      },
    }),
    ...(props.body.sellerEmail !== undefined && {
      seller: {
        email: {
          contains: props.body.sellerEmail,
        },
      },
    }),
    ...(props.body.shopName !== undefined && {
      seller: {
        shop_name: {
          contains: props.body.shopName,
        },
      },
    }),
  } satisfies Prisma.shopping_mall_seller_approval_requestsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { submitted_at: "desc" },
      ...ShoppingMallSellerApprovalRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerApprovalRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallSellerApprovalRequest.ISummary;
}
