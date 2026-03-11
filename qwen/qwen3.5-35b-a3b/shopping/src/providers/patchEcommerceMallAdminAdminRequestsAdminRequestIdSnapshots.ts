import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequestsAdminRequestIdSnapshots(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallAdminRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  const adminRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findFirst({
      where: { id: props.adminRequestId },
      select: { id: true },
    });
  if (adminRequest === null) {
    throw new HttpException("Admin request not found", 404);
  }
  const whereInput: Prisma.ecommerce_mall_admin_request_snapshotsWhereInput = {
    ecommerce_mall_admin_request_request_id: props.adminRequestId,
    ...(props.body.status !== undefined && {
      request_status: props.body.status,
    }),
    ...(props.body.changedBy !== null &&
      props.body.changedBy !== undefined && {
        changed_by: props.body.changedBy,
      }),
    ...(props.body.reason !== undefined && {
      reason: { contains: props.body.reason },
    }),
    ...(props.body.dateRange !== undefined &&
      (props.body.dateRange.startAt !== undefined ||
        props.body.dateRange.endAt !== undefined) && {
        changed_at: {
          ...(props.body.dateRange.startAt !== undefined && {
            gte: props.body.dateRange.startAt,
          }),
          ...(props.body.dateRange.endAt !== undefined && {
            lte: props.body.dateRange.endAt,
          }),
        },
      }),
  } satisfies Prisma.ecommerce_mall_admin_request_snapshotsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_admin_request_snapshotsOrderByWithRelationInput[] =
    [
      {
        changed_at:
          props.body.sort === "created_at"
            ? "asc"
            : props.body.sort === "id"
              ? "asc"
              : "desc",
      },
    ];
  const data =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        reason: true,
        request_status: true,
        created_at: true,
        changed_at: true,
        changed_by: true,
        adminRequest: {
          select: {
            id: true,
            reason: true,
            request_status: true,
            created_at: true,
            updated_at: true,
          },
        },
        changedBy: {
          select: {
            id: true,
            email: true,
            is_banned: true,
            ban_reason: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (record) => {
      const adminRequestData = record.adminRequest;
      const changedByData = record.changedBy;
      const customer: IEcommerceMallCustomer.ISummary | null = null;
      const seller: IEcommerceMallSeller.ISummary | null = null;
      const changedBy: IEcommerceMallAdmin.ISummary | null = changedByData
        ? ({
            id: changedByData.id,
            email: changedByData.email,
            is_banned: changedByData.is_banned,
            ban_reason: changedByData.ban_reason,
            created_at: toISOStringSafe(changedByData.created_at),
            updated_at: toISOStringSafe(changedByData.updated_at),
          } satisfies IEcommerceMallAdmin.ISummary)
        : null;
      return {
        id: record.id,
        reason: record.reason,
        requestStatus: typia.assert<"pending" | "approved" | "rejected">(
          record.request_status,
        ),
        createdAt: toISOStringSafe(record.created_at),
        changedAt: toISOStringSafe(record.changed_at),
        adminRequest: {
          id: adminRequestData.id,
          reason: adminRequestData.reason,
          request_status: adminRequestData.request_status,
          created_at: toISOStringSafe(adminRequestData.created_at),
          updated_at: toISOStringSafe(adminRequestData.updated_at),
          customer,
          seller,
        } satisfies IEcommerceMallAdminRequestRequest.ISummary,
        changedBy,
      } satisfies IEcommerceMallAdminRequestSnapshot.ISummary;
    }),
  };
}
