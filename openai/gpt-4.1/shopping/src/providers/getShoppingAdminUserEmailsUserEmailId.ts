import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingUserEmail";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminUserEmailsUserEmailId(props: {
  admin: AdminPayload;
  userEmailId: string & tags.Format<"uuid">;
}): Promise<IShoppingUserEmail> {
  // Find record by ID. Don't return soft-deleted rows. Throw 404 if not found.
  const emailRecord = await MyGlobal.prisma.shopping_user_emails.findFirst({
    where: {
      id: props.userEmailId,
      deleted_at: null,
    },
  });
  if (!emailRecord) {
    throw new HttpException("User email not found", 404);
  }
  return {
    id: emailRecord.id,
    shopping_customer_id:
      emailRecord.shopping_customer_id === null
        ? undefined
        : emailRecord.shopping_customer_id,
    shopping_seller_id:
      emailRecord.shopping_seller_id === null
        ? undefined
        : emailRecord.shopping_seller_id,
    email: emailRecord.email,
    is_verified: emailRecord.is_verified,
    is_primary: emailRecord.is_primary,
    created_at: toISOStringSafe(emailRecord.created_at),
    updated_at: toISOStringSafe(emailRecord.updated_at),
    deleted_at: emailRecord.deleted_at
      ? toISOStringSafe(emailRecord.deleted_at)
      : undefined,
  };
}
