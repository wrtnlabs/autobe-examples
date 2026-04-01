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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberRefundRequests(props: {
  member: MemberPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const whereRefunds = {
    deleted_at: null as any,
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
    ...(props.body.sellerComment !== null && {
      seller_comment: {
        contains: props.body.sellerComment,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.decisionedAt !== null && {
      decisioned_at: new Date(props.body.decisionedAt),
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: new Date(props.body.createdAt),
    }),
    shopping_mall_order_item: {
      order: { shopping_customer_id: props.member.id },
    },
  };
  const data = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    where: whereRefunds as any,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "asc" }],
    select: {
      id: true,
      shopping_mall_order_item_id: true,
      customer_reason: true,
      status: true,
      seller_comment: true,
      decisioned_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_refund_requests.count({
    where: whereRefunds as any,
  });
  return {
    data: data.map((r) => ({
      id: r.id as any,
      shoppingMallOrderItemId: r.shopping_mall_order_item_id as any,
      customerReason: r.customer_reason,
      status: r.status,
      sellerComment: r.seller_comment,
      decisionedAt: r.decisioned_at?.toISOString() ?? null,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
      deletedAt: r.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page as any,
      limit: limit as any,
      records: total as any,
      pages: Math.ceil(total / limit) as any,
    },
  };
}
