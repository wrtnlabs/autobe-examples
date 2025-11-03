import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingSeller> {
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: { id: props.sellerId, deleted_at: null },
    select: {
      id: true,
      email: true,
      display_name: true,
      contact_phone: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  return {
    id: seller.id,
    email: seller.email,
    display_name: seller.display_name,
    contact_phone: seller.contact_phone,
    status: seller.status,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
  };
}
