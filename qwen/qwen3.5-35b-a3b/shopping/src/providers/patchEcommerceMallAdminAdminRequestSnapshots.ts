import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
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
import { EcommerceMallAdminRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallAdminRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequestSnapshots(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallAdminRequestSnapshot.ISummary> {
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirstOrThrow({
    where: { id: props.admin.id },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const safeLimit = Math.min(limit, 100);
  const pageSize = props.body.pageSize ?? Math.min(safeLimit, 100);
  const skip = (page - 1) * pageSize;
  const whereClause: Prisma.ecommerce_mall_admin_request_snapshotsWhereInput = {
    request_status: props.body.requestStatus,
  };
  if (props.body.startDate !== null && props.body.startDate !== undefined) {
    whereClause.changed_at = {
      gte: new Date(props.body.startDate),
    };
  }
  if (props.body.endDate !== null && props.body.endDate !== undefined) {
    if (props.body.startDate !== null && props.body.startDate !== undefined) {
      whereClause.changed_at = {
        gte: new Date(props.body.startDate),
        lte: new Date(props.body.endDate),
      };
    } else {
      whereClause.changed_at = {
        lte: new Date(props.body.endDate),
      };
    }
  }
  if (props.body.reason !== undefined) {
    whereClause.reason = {
      contains: props.body.reason,
      mode: "insensitive",
    };
  }
  const orderByInput = (() => {
    const sortBy = props.body.sortBy ?? "changed_at";
    const sortOrder = props.body.sortOrder ?? "DESC";
    return {
      [sortBy]: sortOrder,
    } satisfies Prisma.ecommerce_mall_admin_request_snapshotsOrderByWithRelationInput;
  })();
  const data =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: orderByInput,
      ...EcommerceMallAdminRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.count({
      where: whereClause,
    });
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdminRequestSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallAdminRequestSnapshot.ISummary;
}
