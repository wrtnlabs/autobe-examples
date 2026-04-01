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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdminPromotionRequestSnapshotTransformer } from "../transformers/ShoppingMallAdminPromotionRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerAdminPromotionRequestsRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
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
      400,
    );
  }
  const isSubmitter = await (async () => {
    if (snapshot.request.actor_type === "customer") {
      const link =
        await MyGlobal.prisma.shopping_mall_admin_promotion_request_of_customers.findFirst(
          {
            where: {
              shopping_mall_admin_promotion_request_id: props.requestId,
              customer: { id: props.customer.id },
            },
          },
        );
      return link !== null;
    } else {
      return false;
    }
  })();
  if (!isSubmitter) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallAdminPromotionRequestSnapshotTransformer.transform(
    snapshot,
  );
}
