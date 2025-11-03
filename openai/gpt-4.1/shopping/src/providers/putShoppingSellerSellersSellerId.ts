import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerSellersSellerId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSeller.IUpdate;
}): Promise<IShoppingSeller> {
  const { seller, sellerId, body } = props;

  // Authorization: Only allow the authenticated seller to update their own account
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: You can only update your own seller account.",
      403,
    );
  }

  // Fetch the seller to ensure existence and not soft-deleted
  const current = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: {
      id: sellerId,
      deleted_at: null,
    },
  });
  if (!current) {
    throw new HttpException("Seller not found or has been deleted.", 404);
  }

  // Always set updated_at to new timestamp (never allow null/undefined)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_sellers.update({
    where: { id: sellerId },
    data: {
      display_name: body.display_name ?? undefined,
      contact_phone: body.contact_phone ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    contact_phone: updated.contact_phone,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
