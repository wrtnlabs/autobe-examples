import { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
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

export async function patchEcommerceMallAdminSnapshotAudits(props: {
  admin: AdminPayload;
  body: IEcommerceMallSnapshotAudit.IRequest;
}): Promise<IPageIEcommerceMallSnapshotAudit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_snapshot_auditsWhereInput = {
    ...(props.body.recordType !== undefined && {
      record_type: props.body.recordType,
    }),
    ...(props.body.recordId !== undefined && {
      record_id: props.body.recordId,
    }),
    ...(props.body.changedBy !== undefined && {
      changed_by: props.body.changedBy,
    }),
    ...(props.body.minChangedAt !== undefined && {
      changed_at: {
        gte: new Date(props.body.minChangedAt),
      },
    }),
    ...(props.body.maxChangedAt !== undefined && {
      changed_at: {
        lte: new Date(props.body.maxChangedAt),
      },
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_snapshot_auditsOrderByWithRelationInput =
    props.body.sortBy
      ? {
          ...(props.body.sortBy === "id" && {
            id: props.body.sortOrder === "asc" ? "asc" : "desc",
          }),
          ...(props.body.sortBy === "changed_at" && {
            changed_at: props.body.sortOrder === "asc" ? "asc" : "desc",
          }),
          ...(props.body.sortBy === "record_type" && {
            record_type: props.body.sortOrder === "asc" ? "asc" : "desc",
          }),
          ...(props.body.sortBy === "changed_by" && {
            changed_by: props.body.sortOrder === "asc" ? "asc" : "desc",
          }),
        }
      : { changed_at: "desc" };
  const data = await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      record_type: true,
      record_id: true,
      changed_at: true,
      changed_by: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_snapshot_audits.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      record_type: record.record_type,
      record_id: record.record_id as string & tags.Format<"uuid">,
      changed_at: toISOStringSafe(record.changed_at) as string &
        tags.Format<"date-time">,
      changed_by: record.changed_by as string & tags.Format<"uuid">,
    })),
  };
}
