import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const { admin, sellerId } = props;

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: sellerId,
    },
    select: {
      id: true,
      email: true,
      business_name: true,
      business_type: true,
      contact_person_name: true,
      phone: true,
      account_status: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email,
    business_name: seller.business_name,
    business_type: seller.business_type,
    contact_person_name: seller.contact_person_name,
    phone: seller.phone,
    account_status: seller.account_status,
    email_verified: seller.email_verified,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
  };
}
