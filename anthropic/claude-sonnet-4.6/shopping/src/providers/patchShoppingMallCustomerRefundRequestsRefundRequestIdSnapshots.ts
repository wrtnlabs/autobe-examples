import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot.ISummary> {
  // Step 1: Verify the refund request exists (auto 404 if not found)
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        orderItem: {
          select: {
            order: {
              select: {
                shopping_mall_customer_id: true,
              },
            },
          },
        },
      },
    });
  // Step 2: Verify customer ownership — the order must belong to this customer
  if (
    refundRequest.orderItem.order.shopping_mall_customer_id !==
    props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Build pagination params
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Build where clause with optional date range filter
  const whereInput = {
    shopping_mall_refund_request_id: props.refundRequestId,
    ...(props.body.from !== undefined || props.body.to !== undefined
      ? {
          created_at: {
            ...(props.body.from !== undefined && {
              gte: new Date(props.body.from),
            }),
            ...(props.body.to !== undefined && {
              lte: new Date(props.body.to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_refund_request_snapshotsWhereInput;
  // Step 5: Build order by — ASC by default (chronological), DESC if requested
  const orderByInput = (
    props.body.sort === "desc"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const }
  ) satisfies Prisma.shopping_mall_refund_request_snapshotsOrderByWithRelationInput;
  // Step 6: Query data and total count sequentially
  const data =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_refund_request_id: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Step 7: Map to ISummary and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (snapshot) =>
        ({
          id: snapshot.id as string & tags.Format<"uuid">,
          refundRequestId: snapshot.shopping_mall_refund_request_id as string &
            tags.Format<"uuid">,
          createdAt: snapshot.created_at.toISOString() as string &
            tags.Format<"date-time">,
        }) satisfies IShoppingMallRefundRequestSnapshot.ISummary,
    ),
  } satisfies IPageIShoppingMallRefundRequestSnapshot.ISummary;
}
