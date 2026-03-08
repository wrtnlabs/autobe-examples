import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSellersSellerIdApprove(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller> {
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
    },
  );
  if (seller.approval_status !== "pending") {
    throw new HttpException("Seller is not pending approval", 400);
  }
  if (seller.is_banned) {
    throw new HttpException("Cannot approve banned seller", 403);
  }
  if (seller.is_suspended) {
    throw new HttpException("Cannot approve suspended seller", 400);
  }
  const updated = await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: "approved",
      updated_at: new Date(),
    },
  });
  return {
    id: updated.id,
    email: updated.email,
    approval_status: typia.assert<"pending" | "approved" | "rejected">(
      updated.approval_status,
    ),
    rejection_reason: updated.rejection_reason ?? undefined,
    is_suspended: updated.is_suspended,
    is_banned: updated.is_banned,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at != null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
