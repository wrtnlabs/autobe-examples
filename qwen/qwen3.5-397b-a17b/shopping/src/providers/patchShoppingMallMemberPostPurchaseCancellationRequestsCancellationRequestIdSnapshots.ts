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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallPostPurchaseCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallPostPurchaseCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberPostPurchaseCancellationRequestsCancellationRequestIdSnapshots(props: {
  member: MemberPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallPostPurchaseCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallPostPurchaseCancellationRequestSnapshot.ISummary> {
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_post_purchase_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          shopping_mall_order_item_id: true,
          shopping_mall_member_id: true,
          shopping_mall_seller_id: true,
        },
      },
    );
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: cancellationRequest.shopping_mall_order_item_id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  const isCustomer =
    cancellationRequest.shopping_mall_member_id === props.member.id;
  const isSeller = orderItem.shopping_mall_seller_id === props.member.id;
  if (!isCustomer && !isSeller) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtFilter: {
    gte?: string;
    lte?: string;
  } = {};
  if (props.body.from !== undefined) {
    createdAtFilter.gte = props.body.from;
  }
  if (props.body.to !== undefined) {
    createdAtFilter.lte = props.body.to;
  }
  const whereInput = {
    shopping_mall_post_purchase_cancellation_request_id:
      props.cancellationRequestId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(props.body.hasSellerResponse !== undefined && {
      seller_response: props.body.hasSellerResponse
        ? { not: null }
        : { equals: null },
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
