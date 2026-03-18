import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallRefundRequestAtSummaryTransformer } from "../transformers/ShoppingMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberRefundRequests(props: {
  member: MemberPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.shoppingMallOrderItemId !== undefined && {
      shopping_mall_order_item_id: props.body.shoppingMallOrderItemId,
    }),
    ...(props.body.customerReason !== undefined && {
      customer_reason: {
        contains: props.body.customerReason,
        mode: "insensitive" as const,
      },
    }),
    // sellerComment is nullable in DTO input; filter only when non-null
    ...(props.body.sellerComment !== null && {
      seller_comment: {
        contains: props.body.sellerComment,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.decisionedAt !== null && {
      decisioned_at: props.body.decisionedAt as any,
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: props.body.createdAt as any,
    }),
    // visibility scope via order_items -> orders
    orderItem: {
      deleted_at: null,
      order: {
        shopping_customer_id: props.member.id,
        deleted_at: null,
      },
    },
  } satisfies Prisma.shopping_mall_refund_requestsWhereInput;
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.count({ where }),
    MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      ...ShoppingMallRefundRequestAtSummaryTransformer.select(),
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(rows, (r) =>
      ShoppingMallRefundRequestAtSummaryTransformer.transform(r),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIShoppingMallRefundRequest.ISummary;
}
