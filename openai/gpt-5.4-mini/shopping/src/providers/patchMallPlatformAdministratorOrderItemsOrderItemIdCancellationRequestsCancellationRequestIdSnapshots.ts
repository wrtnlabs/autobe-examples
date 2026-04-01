import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCancellationRequestSnapshotTransformer } from "../transformers/MallPlatformCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformCancellationRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformCancellationRequestSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const cancellationRequest =
    await MyGlobal.prisma.mall_platform_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
        },
        select: {
          id: true,
          mall_platform_order_item_id: true,
        },
      },
    );
  if (cancellationRequest.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException("Not Found", 404);
  }
  const where: Prisma.mall_platform_cancellation_request_snapshotsWhereInput = {
    mall_platform_cancellation_request_id: props.cancellationRequestId,
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              snapshot_status: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              review_result: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            { reason: { contains: props.body.search, mode: "insensitive" } },
          ],
        }),
  };
  const data =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findMany(
      {
        where,
        orderBy: [
          { changed_at: "desc" },
          { created_at: "desc" },
          { id: "desc" },
        ],
        skip,
        take: limit,
        ...MallPlatformCancellationRequestSnapshotTransformer.select(),
      },
    );
  const records =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (snapshot) => {
      const transformed =
        await MallPlatformCancellationRequestSnapshotTransformer.transform(
          snapshot,
        );
      return {
        ...transformed,
        cancellationRequest: {
          id: cancellationRequest.id,
          mallPlatformOrderItemId:
            cancellationRequest.mall_platform_order_item_id,
        },
      };
    }),
  };
}
