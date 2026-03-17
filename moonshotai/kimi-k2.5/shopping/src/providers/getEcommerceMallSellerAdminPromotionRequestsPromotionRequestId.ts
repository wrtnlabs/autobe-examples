import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerAdminPromotionRequestsPromotionRequestId(props: {
  seller: SellerPayload;
  promotionRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  // Verify seller has super administrator privileges by checking admin table
  // Note: Checking if this seller is a super admin
  // The admin table is queried by id directly as user_id doesn't exist
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      id: props.seller.id,
      grade: "super_admin",
      deleted_at: null,
    },
  });
  if (admin === null) {
    throw new HttpException(
      "Forbidden - Only super administrators can view promotion request details",
      403,
    );
  }
  const promotionRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: props.promotionRequestId,
          deleted_at: null,
        },
        ...EcommerceMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await EcommerceMallAdminPromotionRequestTransformer.transform(
    promotionRequest,
  );
}
