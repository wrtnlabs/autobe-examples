import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformRefundRequestSnapshotTransformer } from "../transformers/MallPlatformRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformRefundRequestSnapshot> {
  await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
    where: {
      id: props.refundRequestId,
    },
    select: {
      id: true,
    },
  });
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
