import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { EcommerceMallSnapshotAuditAtSummaryTransformer } from "../transformers/EcommerceMallSnapshotAuditAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSnapshotAudits(props: {
  admin: AdminPayload;
  body: IEcommerceMallSnapshotAudit.IRequest;
}): Promise<IPageIEcommerceMallSnapshotAudit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_snapshot_auditsWhereInput = {
    record_type: props.body.record_type
      ? {
          in: props.body.record_type,
        }
      : undefined,
    changed_by: props.body.changed_by ?? undefined,
    changed_at: {
      ...(props.body.from_changed_at && {
        gte: props.body.from_changed_at,
      }),
      ...(props.body.to_changed_at && {
        lt: props.body.to_changed_at,
      }),
    },
  } satisfies Prisma.ecommerce_mall_snapshot_auditsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_snapshot_auditsOrderByWithRelationInput =
    props.body.sort === "changed_at"
      ? { changed_at: "desc" }
      : props.body.sort === "created_at"
        ? { created_at: "desc" }
        : props.body.sort === "record_type"
          ? { record_type: "asc" }
          : props.body.sort === "changed_by"
            ? { changed_by: "asc" }
            : { changed_at: "desc" };
  const data = await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallSnapshotAuditAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_snapshot_audits.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallSnapshotAuditAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
