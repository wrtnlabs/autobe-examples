import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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

export async function patchEcommerceMallCustomerCancellationRequestsRequestIdSnapshots(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot> {
  // 1. Find the cancellation request to verify existence and ownership
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          ecommerce_mall_customer_id: true,
        },
      },
    );
  // 2. Authorization: Verify customer owns this cancellation request
  if (cancellationRequest.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Build date range filter properly
  const createdAtFilter = {
    ...(props.body.createdAtFrom !== undefined && {
      gte: new Date(props.body.createdAtFrom),
    }),
    ...(props.body.createdAtTo !== undefined && {
      lte: new Date(props.body.createdAtTo),
    }),
  };
  // 5. Build query filters
  const whereInput = {
    ecommerce_mall_cancellation_request_id: props.requestId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  // 6. Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          status: true,
          reason: true,
          created_at: true,
          cancellationRequest: {
            select: {
              id: true,
              ecommerce_mall_customer_id: true,
              reason: true,
              status: true,
              created_at: true,
            },
          },
        },
      },
    );
  // 7. Count total records for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  // 8. Return paginated results
  return {
    data: await ArrayUtil.asyncMap(snapshots, async (snapshot) =>
      typia.assert<IEcommerceMallCancellationRequestSnapshot>({
        id: snapshot.id,
        status: snapshot.status,
        reason: snapshot.reason,
        cancellation_request: typia.assert<IEcommerceMallCancellationRequest>({
          id: snapshot.cancellationRequest.id,
          customer_id: snapshot.cancellationRequest.ecommerce_mall_customer_id,
          reason: snapshot.cancellationRequest.reason,
          status: snapshot.cancellationRequest.status,
          created_at: toISOStringSafe(snapshot.cancellationRequest.created_at),
        }),
        created_at: toISOStringSafe(snapshot.created_at),
      }),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
