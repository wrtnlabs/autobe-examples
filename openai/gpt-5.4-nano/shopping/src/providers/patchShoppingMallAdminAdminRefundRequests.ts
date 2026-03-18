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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const pageInput = props.body.page ?? 1;
  const limitInput = props.body.limit ?? 100;
  const page = pageInput;
  const limit = limitInput;
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
        mode: "insensitive" as Prisma.QueryMode,
      },
    }),
    ...(props.body.sellerComment !== undefined && {
      seller_comment:
        props.body.sellerComment === null
          ? null
          : {
              contains: props.body.sellerComment,
              mode: "insensitive" as Prisma.QueryMode,
            },
    }),
    ...(props.body.decisionedAt !== undefined && {
      decisioned_at: props.body.decisionedAt,
    }),
    ...(props.body.createdAt !== undefined && {
      created_at: props.body.createdAt,
    }),
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "asc" }],
      skip,
      take: limit,
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
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({ where }),
  ]);
  return {
    data: rows.map((r) => ({
      id: r.id,
      shoppingMallOrderItemId: r.shopping_mall_order_item_id,
      customerReason: r.customer_reason,
      status: r.status,
      sellerComment: r.seller_comment,
      decisionedAt: r.decisioned_at ? toISOStringSafe(r.decisioned_at) : null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIShoppingMallRefundRequest.ISummary;
}
