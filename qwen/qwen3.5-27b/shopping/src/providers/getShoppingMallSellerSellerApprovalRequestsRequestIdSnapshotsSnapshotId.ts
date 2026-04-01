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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerApprovalSnapshotTransformer } from "../transformers/ShoppingMallSellerApprovalSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSellerApprovalRequestsRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApprovalSnapshot> {
  // Validate that the requesting seller has administrator privileges
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: props.seller.id,
    },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the snapshot with transformer's select to get nested sellerApprovalRequest
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
  // Transform and return the snapshot
  return await ShoppingMallSellerApprovalSnapshotTransformer.transform(
    snapshot,
  );
}
