import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrativeRejectionReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeRejectionReason";
import { IShoppingMallDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryConfirmation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminAdminsSellersSellerIdReject(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministrativeRejectionReason;
}): Promise<IShoppingMallDeliveryConfirmation> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller application not found", 404);
  }
  if (seller.is_approved === true) {
    throw new HttpException(
      "Seller application is not in pending approval status",
      400,
    );
  }
  const updatedSeller = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_approved: false,
      is_suspended: false,
      approval_rejection_reason: props.body.reason,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    status: "rejected",
    timestamp: toISOStringSafe(new Date()),
  };
}
