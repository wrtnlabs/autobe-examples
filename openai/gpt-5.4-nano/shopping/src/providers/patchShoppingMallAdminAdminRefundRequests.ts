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
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit < 1 ? 1 : limit;
  const skip = (safePage - 1) * safeLimit;
  const where = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(props.body.shoppingMallOrderItemId !== undefined && {
      shopping_mall_order_item_id: props.body.shoppingMallOrderItemId,
    }),
    ...(props.body.customerReason !== undefined && {
      customer_reason: {
        contains: props.body.customerReason,
        mode: "insensitive",
      },
    }),
    ...(props.body.sellerComment !== null &&
      props.body.sellerComment !== undefined && {
        seller_comment: {
          contains: props.body.sellerComment,
          mode: "insensitive",
        },
      }),
    ...(props.body.decisionedAt !== null && {
      decisioned_at:
        props.body.decisionedAt === null
          ? null
          : new Date(props.body.decisionedAt),
    }),
    ...(props.body.createdAt !== undefined &&
      props.body.createdAt !== null && {
        created_at: new Date(props.body.createdAt),
      }),
  } satisfies Prisma.shopping_mall_refund_requestsWhereInput;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: [{ created_at: "desc" }, { id: "asc" }],
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        status: true,
        customer_reason: true,
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
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data: rows.map((r) => ({
      id: r.id,
      shoppingMallOrderItemId: r.shopping_mall_order_item_id,
      customerReason: r.customer_reason,
      status: r.status,
      sellerComment: r.seller_comment,
      decisionedAt: r.decisioned_at ? r.decisioned_at.toISOString() : null,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
      deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
    })),
  } satisfies IPageIShoppingMallRefundRequest.ISummary;
}
