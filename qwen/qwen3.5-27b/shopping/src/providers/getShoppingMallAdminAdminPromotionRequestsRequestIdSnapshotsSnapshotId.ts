import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminPromotionSnapshotTransformer } from "../transformers/ShoppingMallAdminPromotionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminPromotionRequestsRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminPromotionSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_admin_promotion_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          shopping_mall_admin_promotion_request_id: props.requestId,
        },
        ...ShoppingMallAdminPromotionSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallAdminPromotionSnapshotTransformer.transform(
    snapshot,
  );
}
