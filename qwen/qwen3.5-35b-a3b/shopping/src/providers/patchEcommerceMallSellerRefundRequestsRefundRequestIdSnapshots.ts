import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const whereCondition: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput =
    {
      refund_request_id: props.refundRequestId,
      deleted_at: null,
    };
  if (props.body.action_type !== undefined) {
    whereCondition.action_type = props.body.action_type;
  }
  if (props.body.created_at_before !== undefined) {
    whereCondition.created_at = { lte: new Date(props.body.created_at_before) };
  }
  if (props.body.created_at_after !== undefined) {
    const existingFilter = whereCondition.created_at;
    whereCondition.created_at =
      existingFilter &&
      typeof existingFilter === "object" &&
      "lte" in existingFilter
        ? {
            lte: existingFilter.lte,
            gte: new Date(props.body.created_at_after),
          }
        : { gte: new Date(props.body.created_at_after) };
  }
  if (props.body.status_before !== undefined) {
    whereCondition.status_before = props.body.status_before;
  }
  if (props.body.status_after !== undefined) {
    whereCondition.status_after = props.body.status_after;
  }
  const orderByCondition =
    props.body.sort_order === "ASC"
      ? props.body.sort_by === "action_type"
        ? { actor_type: "asc" as const }
        : props.body.sort_by === "actor_type"
          ? { actor_type: "asc" as const }
          : { created_at: "asc" as const }
      : props.body.sort_by === "action_type"
        ? { actor_type: "desc" as const }
        : props.body.sort_by === "actor_type"
          ? { actor_type: "desc" as const }
          : { created_at: "desc" as const };
  const data =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereCondition,
      orderBy: orderByCondition,
      skip: (page - 1) * limit,
      take: limit + 1,
    });
  const hasMore = data.length > limit;
  const resultData = hasMore ? data.slice(0, -1) : data;
  const total =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereCondition,
    });
  const transformedData = await ArrayUtil.asyncMap(
    resultData,
    async (snapshot) => ({
      id: snapshot.id,
      refundRequestId: snapshot.refund_request_id,
      actorType: typia.assert<"customer" | "seller" | "admin" | "super_admin">(
        snapshot.actor_type,
      ),
      actionType: typia.assert<
        | "approved"
        | "rejected"
        | "created"
        | "status_changed"
        | "response_added"
      >(snapshot.action_type),
      statusBefore: snapshot.status_before,
      statusAfter: snapshot.status_after,
      reasonBefore: snapshot.reason_before,
      reasonAfter: snapshot.reason_after,
      responseBefore: snapshot.response_before,
      responseAfter: snapshot.response_after,
      metadataBefore: snapshot.metadata_before,
      metadataAfter: snapshot.metadata_after,
      createdAt: toISOStringSafe(snapshot.created_at),
      deletedAt: snapshot.deleted_at
        ? toISOStringSafe(snapshot.deleted_at)
        : null,
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
