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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdministratorRefundRequestSnapshotsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequestSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findFirstOrThrow(
      {
        where: { id: props.id },
      },
    );
  return {
    id: record.id,
    refund_request_id: record.refund_request_id,
    order_item_id: record.order_item_id,
    status: record.status,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
    responded_at:
      record.responded_at !== null
        ? toISOStringSafe(record.responded_at)
        : null,
    approved_by_seller_id: record.approved_by_seller_id,
    rejection_reason: record.rejection_reason,
    snapshot_at: toISOStringSafe(record.snapshot_at),
    deleted_at:
      record.deleted_at !== null ? toISOStringSafe(record.deleted_at) : null,
    order_item: null,
    approved_by_seller: null,
    rejected_by_seller: null,
  } satisfies IEcommerceMallRefundRequestSnapshot;
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
// export async function getEcommerceMallAdministratorRefundRequestSnapshotsId(props: {
//   administrator: AdministratorPayload;
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