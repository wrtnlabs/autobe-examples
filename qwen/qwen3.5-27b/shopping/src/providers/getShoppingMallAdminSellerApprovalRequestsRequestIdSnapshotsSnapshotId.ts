import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerApprovalSnapshotTransformer } from "../transformers/ShoppingMallSellerApprovalSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSellerApprovalRequestsRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApprovalSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_seller_approval_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          shopping_mall_seller_approval_request_id: props.requestId,
        },
        ...ShoppingMallSellerApprovalSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallSellerApprovalSnapshotTransformer.transform(
    snapshot,
  );
}
