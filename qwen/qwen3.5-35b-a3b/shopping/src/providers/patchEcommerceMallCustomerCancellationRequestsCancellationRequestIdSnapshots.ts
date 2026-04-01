import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
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

export async function patchEcommerceMallCustomerCancellationRequestsCancellationRequestIdSnapshots(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: { id: true, customer_id: true, status: true, deleted_at: true },
      },
    );
  if (cancellationRequest.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Invalid page number", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit value", 400);
  }
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      cancellation_request_id: props.cancellationRequestId,
      ...(props.body.actor_type !== undefined && {
        actor_type: props.body.actor_type,
      }),
      ...(props.body.status_before !== undefined && {
        status_before: props.body.status_before,
      }),
      ...(props.body.status_after !== undefined && {
        status_after: props.body.status_after,
      }),
      ...(props.body.action !== undefined && { action: props.body.action }),
      ...(props.body.created_at_from !== undefined && {
        created_at: { gte: props.body.created_at_from },
      }),
      ...(props.body.created_at_to !== undefined && {
        created_at: { lte: props.body.created_at_to },
      }),
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          cancellation_request_id: true,
          actor_type: true,
          status_before: true,
          status_after: true,
          action: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  const data: IEcommerceMallCancellationRequestSnapshot.ISummary[] =
    await ArrayUtil.asyncMap(snapshots, async (snapshot) => ({
      id: snapshot.id,
      cancellationRequestId: snapshot.cancellation_request_id,
      actorType: snapshot.actor_type,
      statusBefore: snapshot.status_before,
      statusAfter: snapshot.status_after,
      action: snapshot.action,
      createdAt: toISOStringSafe(snapshot.created_at),
      updatedAt: toISOStringSafe(snapshot.updated_at),
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
