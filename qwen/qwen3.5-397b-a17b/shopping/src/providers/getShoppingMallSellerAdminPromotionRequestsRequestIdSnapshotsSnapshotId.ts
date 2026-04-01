import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallAdminPromotionRequestSnapshotTransformer } from "../transformers/ShoppingMallAdminPromotionRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerAdminPromotionRequestsRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminPromotionRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_admin_promotion_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...ShoppingMallAdminPromotionRequestSnapshotTransformer.select(),
      },
    );
  if (snapshot.request.id !== props.requestId) {
    throw new HttpException(
      "Snapshot does not belong to the specified request",
      404,
    );
  }
  const isSubmitter =
    await MyGlobal.prisma.shopping_mall_admin_promotion_request_of_sellers.findUnique(
      {
        where: {
          shopping_mall_admin_promotion_request_id: props.requestId,
          shopping_mall_seller_id: props.seller.id,
        },
      },
    );
  const isRespondingSuperAdmin =
    snapshot.respondingSuperAdministrator !== null &&
    snapshot.respondingSuperAdministrator.id === props.seller.id;
  if (!isSubmitter && !isRespondingSuperAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallAdminPromotionRequestSnapshotTransformer.transform(
    snapshot,
  );
}
