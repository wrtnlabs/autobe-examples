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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCancellationRequestSnapshots(props: {
  customer: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "customer";
  };
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    cancellationRequest: {
      orderItem: {
        order: {
          shopping_mall_customer_id: props.customer.id,
        },
      },
    },
    ...(props.body.shopping_mall_cancellation_request_id !== undefined && {
      shopping_mall_cancellation_request_id:
        props.body.shopping_mall_cancellation_request_id,
    }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(((props.body.from !== undefined && props.body.from !== null) ||
      (props.body.to !== undefined && props.body.to !== null)) && {
      created_at: {
        ...(props.body.from !== undefined &&
          props.body.from !== null && { gte: new Date(props.body.from) }),
        ...(props.body.to !== undefined &&
          props.body.to !== null && { lte: new Date(props.body.to) }),
      },
    }),
    ...(props.body.search !== undefined && {
      reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.shopping_mall_cancellation_request_snapshotsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
