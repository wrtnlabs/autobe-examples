import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorOrderItemsOrderItemIdRefundRequestSnapshots(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        order: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
        refundRequests: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });
  if (orderItem.refundRequests.length === 0) {
    throw new HttpException("Refund request not found", 404);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderBy: Prisma.shopping_mall_refund_request_snapshotsOrderByWithRelationInput =
    props.body.order === "asc" ? { created_at: "asc" } : { created_at: "desc" };
  const where: Prisma.shopping_mall_refund_request_snapshotsWhereInput = {
    shopping_mall_refund_request_id: orderItem.refundRequests[0].id,
    ...(props.body.search !== undefined
      ? {
          OR: [
            { reason: { contains: props.body.search } },
            { response_message: { contains: props.body.search } },
          ],
        }
      : {}),
  };
  const snapshots =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        reason: true,
        response_message: true,
        created_at: true,
        refundRequest: {
          select: {
            id: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      refundRequest: {},
      status: snapshot.status,
      reason: snapshot.reason,
      responseMessage: snapshot.response_message,
      createdAt: toISOStringSafe(snapshot.created_at),
    })),
  };
}
