import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformRefundRequestSnapshotTransformer } from "../transformers/MallPlatformRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformRefundRequestSnapshot> {
  const refundRequest =
    await MyGlobal.prisma.mall_platform_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        seller: {
          id: props.seller.id,
        },
      },
      select: {
        id: true,
        seller: {
          select: {
            id: true,
          },
        },
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          mall_platform_refund_request_id: props.refundRequestId,
        },
        ...MallPlatformRefundRequestSnapshotTransformer.select(),
      },
    );
  return await MallPlatformRefundRequestSnapshotTransformer.transform(snapshot);
}
