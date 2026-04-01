import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformRefundRequestSnapshotTransformer } from "../transformers/MallPlatformRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformRefundRequestSnapshot> {
  const refundRequest =
    await MyGlobal.prisma.mall_platform_refund_requests.findUnique({
      where: {
        id: props.refundRequestId,
      },
      select: {
        id: true,
        mall_platform_customer_id: true,
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Not Found", 404);
  }
  if (refundRequest.mall_platform_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.mall_platform_refund_request_snapshots.findUnique({
      where: {
        id: props.snapshotId,
        mall_platform_refund_request_id: props.refundRequestId,
      },
      ...MallPlatformRefundRequestSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Not Found", 404);
  }
  return await MallPlatformRefundRequestSnapshotTransformer.transform(snapshot);
}
