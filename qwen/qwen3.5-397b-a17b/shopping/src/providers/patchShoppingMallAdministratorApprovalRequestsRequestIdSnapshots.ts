import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequestSnapshot";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallSellerApprovalRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorApprovalRequestsRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerApprovalRequestSnapshot.ISummary> {
  await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
    {
      where: { id: props.requestId },
    },
  );
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = page ? (page - 1) * limit : undefined;
  const whereInput: Prisma.shopping_mall_seller_approval_request_snapshotsWhereInput =
    {
      shopping_mall_seller_approval_request_id: props.requestId,
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.from !== undefined || props.body.to !== undefined
        ? {
            reviewed_at: {
              ...(props.body.from !== undefined && { gte: props.body.from }),
              ...(props.body.to !== undefined && { lte: props.body.to }),
            },
          }
        : {}),
    } satisfies Prisma.shopping_mall_seller_approval_request_snapshotsWhereInput;
  const orderByInput = {
    reviewed_at: "desc" as const,
  } satisfies Prisma.shopping_mall_seller_approval_request_snapshotsOrderByWithRelationInput;
  if (props.body.cursor !== undefined) {
    const data =
      await MyGlobal.prisma.shopping_mall_seller_approval_request_snapshots.findMany(
        {
          where: {
            ...whereInput,
            reviewed_at: {
              lt: props.body.cursor,
            },
          } satisfies Prisma.shopping_mall_seller_approval_request_snapshotsWhereInput,
          skip: undefined,
          take: limit + 1,
          orderBy: orderByInput,
          ...ShoppingMallSellerApprovalRequestSnapshotAtSummaryTransformer.select(),
        },
      );
    const hasMore = data.length > limit;
    if (hasMore) {
      data.pop();
    }
    const total =
      await MyGlobal.prisma.shopping_mall_seller_approval_request_snapshots.count(
        {
          where: whereInput,
        },
      );
    return {
      data: await ArrayUtil.asyncMap(
        data,
        ShoppingMallSellerApprovalRequestSnapshotAtSummaryTransformer.transform,
      ),
      pagination: {
        current: page || 1,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  } else {
    const data =
      await MyGlobal.prisma.shopping_mall_seller_approval_request_snapshots.findMany(
        {
          where: whereInput,
          skip: skip !== undefined ? skip : undefined,
          take: limit,
          orderBy: orderByInput,
          ...ShoppingMallSellerApprovalRequestSnapshotAtSummaryTransformer.select(),
        },
      );
    const total =
      await MyGlobal.prisma.shopping_mall_seller_approval_request_snapshots.count(
        {
          where: whereInput,
        },
      );
    return {
      data: await ArrayUtil.asyncMap(
        data,
        ShoppingMallSellerApprovalRequestSnapshotAtSummaryTransformer.transform,
      ),
      pagination: {
        current: page || 1,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
}
