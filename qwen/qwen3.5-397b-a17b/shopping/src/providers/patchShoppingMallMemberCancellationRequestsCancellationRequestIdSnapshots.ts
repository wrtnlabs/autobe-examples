import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberCancellationRequestsCancellationRequestIdSnapshots(props: {
  member: MemberPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          shopping_mall_member_id: true,
        },
      },
    );
  if (cancellationRequest.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.shopping_mall_cancellation_request_snapshotsWhereInput =
    {
      cancellation_request_id: props.cancellationRequestId,
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.reviewedAtFrom !== undefined && {
        reviewed_at: {
          gte: props.body.reviewedAtFrom,
        },
      }),
      ...(props.body.reviewedAtTo !== undefined && {
        reviewed_at: {
          lte: props.body.reviewedAtTo,
        },
      }),
    };
  const orderByInput =
    props.body.sort !== undefined
      ? props.body.sort.map((field) => {
          const desc = field.startsWith("-");
          const cleanField = desc ? field.slice(1) : field;
          if (cleanField === "created_at") {
            return desc
              ? { created_at: Prisma.SortOrder.desc }
              : { created_at: Prisma.SortOrder.asc };
          } else if (cleanField === "reviewed_at") {
            return desc
              ? { reviewed_at: Prisma.SortOrder.desc }
              : { reviewed_at: Prisma.SortOrder.asc };
          } else if (cleanField === "status") {
            return desc
              ? { status: Prisma.SortOrder.desc }
              : { status: Prisma.SortOrder.asc };
          } else if (cleanField === "id") {
            return desc
              ? { id: Prisma.SortOrder.desc }
              : { id: Prisma.SortOrder.asc };
          }
          return { created_at: Prisma.SortOrder.asc };
        })
      : [{ created_at: Prisma.SortOrder.asc }];
  const data =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
  };
}
