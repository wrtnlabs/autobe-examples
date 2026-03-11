import { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallSnapshotAuditTransformer } from "../transformers/EcommerceMallSnapshotAuditTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerSnapshotAuditsAuditId(props: {
  customer: CustomerPayload;
  auditId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSnapshotAudit> {
  const audit =
    await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findUniqueOrThrow({
      where: { id: props.auditId },
      ...EcommerceMallSnapshotAuditTransformer.select(),
    });
  if (audit.changed_by !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSnapshotAuditTransformer.transform(audit);
}
