import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequestSnapshot";
import { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallPostPurchaseCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallPostPurchaseCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminPostPurchaseCancellationRequestsCancellationRequestIdSnapshots(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallPostPurchaseCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_post_purchase_cancellation_request_snapshotsWhereInput =
    {
      shopping_mall_post_purchase_cancellation_request_id:
        props.cancellationRequestId,
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.from !== undefined && {
        created_at: { gte: new Date(props.body.from) },
      }),
      ...(props.body.to !== undefined && {
        created_at: { lte: new Date(props.body.to) },
      }),
      ...(props.body.hasSellerResponse !== undefined && {
        seller_response: props.body.hasSellerResponse ? { not: null } : null,
      }),
    } satisfies Prisma.shopping_mall_post_purchase_cancellation_request_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_post_purchase_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "asc" },
        ...ShoppingMallPostPurchaseCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_post_purchase_cancellation_request_snapshots.count(
      {
        where: whereInput,
      },
    );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallPostPurchaseCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallPostPurchaseCancellationRequestSnapshot.ISummary;
}
