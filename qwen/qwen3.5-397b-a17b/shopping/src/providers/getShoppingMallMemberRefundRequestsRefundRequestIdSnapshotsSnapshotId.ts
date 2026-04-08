import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallRefundRequestSnapshotTransformer } from "../transformers/ShoppingMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequestSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          shopping_mall_refund_request_id: props.refundRequestId,
        },
        ...ShoppingMallRefundRequestSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallRefundRequestSnapshotTransformer.transform(record);
}
