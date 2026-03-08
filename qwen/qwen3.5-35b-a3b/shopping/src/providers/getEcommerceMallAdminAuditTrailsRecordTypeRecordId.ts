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

export async function getEcommerceMallAdminAuditTrailsRecordTypeRecordId(props: {
  admin: AdminPayload;
  recordType: string;
  recordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSnapshotAudit> {
  const allowedRecordTypes: ReadonlyArray<
    | "product"
    | "product_variant"
    | "seller_profile"
    | "order_item"
    | "review"
    | "cancellation_request"
    | "refund_request"
  > = [
    "product",
    "product_variant",
    "seller_profile",
    "order_item",
    "review",
    "cancellation_request",
    "refund_request",
  ];
  const safeRecordType = typia.assert<
    | "product"
    | "product_variant"
    | "seller_profile"
    | "order_item"
    | "review"
    | "cancellation_request"
    | "refund_request"
  >(props.recordType);
  if (allowedRecordTypes.indexOf(safeRecordType) === -1) {
    throw new HttpException("Invalid recordType", 400);
  }
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findFirstOrThrow({
      where: {
        record_type: props.recordType,
        record_id: props.recordId,
      },
      orderBy: { created_at: "desc" },
      ...EcommerceMallSnapshotAuditTransformer.select(),
    });
  return await EcommerceMallSnapshotAuditTransformer.transform(snapshot);
}
