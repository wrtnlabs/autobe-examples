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
  if (
    props.body.submittedAfter &&
    props.body.submittedBefore &&
    new Date(props.body.submittedAfter) > new Date(props.body.submittedBefore)
  ) {
    throw new HttpException(
      "submittedAfter must be before submittedBefore",
      400,
    );
  }
  const whereInput: Prisma.shopping_mall_seller_approval_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.submittedAfter && {
      submitted_at: { gte: new Date(props.body.submittedAfter) },
    }),
    ...(props.body.submittedBefore && {
      submitted_at: { lte: new Date(props.body.submittedBefore) },
    }),
    ...(props.body.sellerEmail && {
      seller: {
        email: { contains: props.body.sellerEmail },
      },
    }),
    ...(props.body.shopName && {
      seller: {
        shop_name: { contains: props.body.shopName },
      },
    }),
  } satisfies Prisma.shopping_mall_seller_approval_requestsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_seller_approval_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { submitted_at: "desc" },
      ...ShoppingMallSellerApprovalRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_seller_approval_requests.count({
      where: whereInput,
    }),
  ]);
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
    },
  } satisfies IPageIShoppingMallSellerApprovalRequest.ISummary;
}
