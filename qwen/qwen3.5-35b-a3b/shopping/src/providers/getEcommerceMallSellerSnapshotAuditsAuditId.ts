import { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSnapshotAuditTransformer } from "../transformers/EcommerceMallSnapshotAuditTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSnapshotAuditsAuditId(props: {
  seller: SellerPayload;
  auditId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSnapshotAudit> {
  const audit =
    await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findUniqueOrThrow({
      where: { id: props.auditId },
      ...EcommerceMallSnapshotAuditTransformer.select(),
    });
  // Sellers can only view snapshot audits for their own products and seller profiles
  if (
    audit.record_type !== "product" &&
    audit.record_type !== "seller_profile"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the seller made this change
  if (audit.changed_by !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSnapshotAuditTransformer.transform(audit);
}
