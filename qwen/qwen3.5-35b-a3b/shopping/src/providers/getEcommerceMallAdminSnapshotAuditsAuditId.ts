import { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSnapshotAuditTransformer } from "../transformers/EcommerceMallSnapshotAuditTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminSnapshotAuditsAuditId(props: {
  admin: AdminPayload;
  auditId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSnapshotAudit> {
  // Query the snapshot audit record with all fields
  const audit =
    await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findUniqueOrThrow({
      where: { id: props.auditId },
      ...EcommerceMallSnapshotAuditTransformer.select(),
    });
  // Transform and return the audit record
  return EcommerceMallSnapshotAuditTransformer.transform(audit);
}
