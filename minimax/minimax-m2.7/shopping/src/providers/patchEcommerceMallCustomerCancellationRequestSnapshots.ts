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
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCancellationRequestSnapshots(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 1: Find cancellation request IDs owned by this customer
  const customerCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        ...(props.body.cancellationRequestId && {
          id: props.body.cancellationRequestId,
        }),
      },
      select: {
        id: true,
      },
    });
  const cancellationRequestIds = customerCancellationRequests.map((r) => r.id);
  // Step 2: Build WHERE clause for snapshots
  const whereClause = {
    ecommerce_mall_cancellation_request_id: {
      in: cancellationRequestIds,
    },
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
        ...(props.body.createdAtTo && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
    ...(!props.body.createdAtFrom &&
      props.body.createdAtTo && {
        created_at: {
          lte: new Date(props.body.createdAtTo),
        },
      }),
  } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  // Step 3: Query snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          created_at: "desc",
        },
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Step 4: Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereClause,
    });
  // Step 5: Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
