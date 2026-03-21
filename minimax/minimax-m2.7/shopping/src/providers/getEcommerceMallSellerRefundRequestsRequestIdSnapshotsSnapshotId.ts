import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestSnapshotAtInvertTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerRefundRequestsRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequestSnapshot.IInvert> {
  // Query the snapshot by ID with transformer select
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallRefundRequestSnapshotAtInvertTransformer.select(),
      },
    );
  // Verify seller owns this snapshot (ownership check via refundRequest.orderItem.productSnapshot.seller.id)
  if (
    snapshot.refundRequest.orderItem.productSnapshot.seller.id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the snapshot
  return await EcommerceMallRefundRequestSnapshotAtInvertTransformer.transform(
    snapshot,
  );
}
