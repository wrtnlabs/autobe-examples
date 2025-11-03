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

export async function putShoppingAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingSeller.IUpdate;
}): Promise<IShoppingSeller> {
  // Find seller (not soft-deleted)
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  const now = toISOStringSafe(new Date());

  // Update allowed fields from body. updated_at always set to 'now' unless explicitly provided in body.
  const updated = await MyGlobal.prisma.shopping_sellers.update({
    where: { id: props.sellerId },
    data: {
      ...(typeof props.body.display_name !== "undefined"
        ? { display_name: props.body.display_name }
        : {}),
      ...(typeof props.body.contact_phone !== "undefined"
        ? { contact_phone: props.body.contact_phone }
        : {}),
      ...(typeof props.body.status !== "undefined"
        ? { status: props.body.status }
        : {}),
      updated_at: props.body.updated_at ?? now,
    },
  });
  // Return full profile
  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    contact_phone: updated.contact_phone,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
