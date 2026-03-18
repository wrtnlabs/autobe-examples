import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
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

export async function getShoppingMallAdministratorOrderItemsOrderItemIdCancellationRequestSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        order: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                shopping_mall_seller_id: true,
              },
            },
          },
        },
      },
    });
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { shopping_mall_order_item_id: orderItem.id },
      select: {
        id: true,
      },
    });
  if (cancellationRequest === null) throw new HttpException("Not Found", 404);
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findUnique(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          shopping_mall_cancellation_request_id: true,
          request_status: true,
          reason: true,
          seller_response: true,
          created_at: true,
        },
      },
    );
  if (snapshot === null) throw new HttpException("Not Found", 404);
  if (snapshot.shopping_mall_cancellation_request_id !== cancellationRequest.id)
    throw new HttpException("Not Found", 404);
  return {
    id: snapshot.id,
    cancellationRequest: {
      id: cancellationRequest.id,
    },
    requestStatus: snapshot.request_status,
    reason: snapshot.reason,
    sellerResponse: snapshot.seller_response,
    createdAt: snapshot.created_at.toISOString(),
  };
}
