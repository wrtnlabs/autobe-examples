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

export async function putShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  // Step 1: Validate seller exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  // Step 2: Enforce unique constraint for email, if updated
  if (props.body.email) {
    const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
      where: {
        email: props.body.email,
        NOT: { id: props.sellerId },
      },
    });
    if (existing) {
      throw new HttpException("Email address already in use", 409);
    }
  }

  // Step 3: Enforce unique constraint for registration_number, if updated
  if (props.body.registration_number) {
    const existingReg = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
      where: {
        registration_number: props.body.registration_number,
        NOT: { id: props.sellerId },
      },
    });
    if (existingReg) {
      throw new HttpException("Registration number already in use", 409);
    }
  }

  // Step 4: Update seller, only mutable fields
  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      ...(props.body.email !== undefined ? { email: props.body.email } : {}),
      ...(props.body.business_name !== undefined
        ? { business_name: props.body.business_name }
        : {}),
      ...(props.body.registration_number !== undefined
        ? { registration_number: props.body.registration_number }
        : {}),
      ...(props.body.business_phone !== undefined
        ? { business_phone: props.body.business_phone }
        : {}),
      ...(props.body.is_email_verified !== undefined
        ? { is_email_verified: props.body.is_email_verified }
        : {}),
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Step 5: Return updated seller in DTO format
  return {
    id: updated.id,
    email: updated.email,
    business_name: updated.business_name,
    registration_number: updated.registration_number,
    business_phone: updated.business_phone,
    is_email_verified: updated.is_email_verified,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
