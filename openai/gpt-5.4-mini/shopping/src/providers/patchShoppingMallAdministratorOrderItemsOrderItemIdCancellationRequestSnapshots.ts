import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
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

export async function patchShoppingMallAdministratorOrderItemsOrderItemIdCancellationRequestSnapshots(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
      },
      select: {
        id: true,
        cancellationRequest: {
          select: {
            id: true,
          },
        },
      },
    });
  if (orderItem.cancellationRequest === null)
    throw new Error("Cancellation request not found.");
  const cancellationRequest = orderItem.cancellationRequest;
  const total: number =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: {
        shopping_mall_cancellation_request_id: cancellationRequest.id,
      },
    });
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: {
          shopping_mall_cancellation_request_id: cancellationRequest.id,
        },
        orderBy: {
          created_at: "desc",
        },
        skip,
        take: limit,
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
  return {
    data: data.map(
      (snapshot): IShoppingMallCancellationRequestSnapshot.ISummary => ({
        id: snapshot.id,
        cancellationRequest: {
          id: snapshot.shopping_mall_cancellation_request_id,
        } satisfies IShoppingMallCancellationRequest.ISummary,
        request_status: snapshot.request_status,
        reason: snapshot.reason,
        seller_response: snapshot.seller_response,
        created_at: toISOStringSafe(snapshot.created_at),
      }),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
