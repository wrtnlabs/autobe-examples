import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSellersSellerId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  const { seller, sellerId, body } = props;

  // CRITICAL: Authorization check - seller can only update their own account
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Unauthorized: You can only update your own seller account",
      403,
    );
  }

  // Prepare timestamp for update
  const now = toISOStringSafe(new Date());

  // Update seller account
  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: sellerId },
    data: {
      business_name: body.business_name ?? undefined,
      updated_at: now,
    },
  });

  // Return formatted response matching IShoppingMallSeller interface
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email as string & tags.Format<"email">,
    business_name: updated.business_name,
    business_type: updated.business_type,
    contact_person_name: updated.contact_person_name,
    phone: updated.phone,
    account_status: updated.account_status,
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
