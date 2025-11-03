import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingUserEmail";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerUserEmailsUserEmailId(props: {
  seller: SellerPayload;
  userEmailId: string & tags.Format<"uuid">;
  body: IShoppingUserEmail.IUpdate;
}): Promise<IShoppingUserEmail> {
  // Step 1: Fetch the email record and verify ownership
  const record = await MyGlobal.prisma.shopping_user_emails.findUnique({
    where: { id: props.userEmailId },
  });
  if (!record || record.deleted_at) {
    throw new HttpException("Email record not found or deleted", 404);
  }
  // Must be owned by this seller actor
  if (record.shopping_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: You may only update your own emails",
      403,
    );
  }
  // Step 2: If email is being updated, check unique constraint violation
  if (props.body.email && props.body.email !== record.email) {
    const duplicate = await MyGlobal.prisma.shopping_user_emails.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new HttpException("Duplicate email not allowed", 409);
    }
  }
  // Step 3: Handle is_primary logic
  if (props.body.is_primary === true) {
    // Only one primary per seller, demote all others in parallel
    await MyGlobal.prisma.shopping_user_emails.updateMany({
      where: {
        shopping_seller_id: props.seller.id,
        is_primary: true,
        deleted_at: null,
        NOT: { id: props.userEmailId },
      },
      data: { is_primary: false },
    });
  }
  // Step 4: Update the record with provided fields only
  const updated = await MyGlobal.prisma.shopping_user_emails.update({
    where: { id: props.userEmailId },
    data: {
      email: props.body.email ?? undefined,
      is_verified: props.body.is_verified ?? undefined,
      is_primary: props.body.is_primary ?? undefined,
      updated_at: props.body.updated_at
        ? toISOStringSafe(props.body.updated_at)
        : toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    shopping_customer_id: updated.shopping_customer_id ?? undefined,
    shopping_seller_id: updated.shopping_seller_id ?? undefined,
    email: updated.email,
    is_verified: updated.is_verified,
    is_primary: updated.is_primary,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
