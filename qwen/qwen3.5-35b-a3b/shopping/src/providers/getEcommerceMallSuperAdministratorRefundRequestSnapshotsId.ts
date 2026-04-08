import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdministratorRefundRequestSnapshotsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequestSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.id },
        select: {
          id: true,
          refund_request_id: true,
          order_item_id: true,
          status: true,
          reason: true,
          created_at: true,
          responded_at: true,
          approved_by_seller_id: true,
          rejection_reason: true,
          snapshot_at: true,
          deleted_at: true,
        },
      },
    );
  const result: IEcommerceMallRefundRequestSnapshot = {
    id: record.id,
    refund_request_id: record.refund_request_id ?? null,
    order_item_id: record.order_item_id,
    status: record.status,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
    responded_at:
      record.responded_at !== null
        ? toISOStringSafe(record.responded_at)
        : null,
    approved_by_seller_id: record.approved_by_seller_id ?? null,
    rejection_reason: record.rejection_reason ?? null,
    snapshot_at: toISOStringSafe(record.snapshot_at),
    deleted_at:
      record.deleted_at !== null ? toISOStringSafe(record.deleted_at) : null,
    order_item: null,
    approved_by_seller: null,
    rejected_by_seller: null,
  };
  return result;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdministratorRefundRequestSnapshotsId(props: {
//   superAdministrator: SuperadministratorPayload;
//   id: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallRefundRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallRefundRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallRefundRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------