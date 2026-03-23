import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallRefundSnapshotTransformer } from "../transformers/ShoppingMallRefundSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_refund_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_refund_request_id: props.refundRequestId,
      },
      ...ShoppingMallRefundSnapshotTransformer.select(),
    });
  return await ShoppingMallRefundSnapshotTransformer.transform(snapshot);
}
