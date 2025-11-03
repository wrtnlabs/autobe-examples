import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingUserEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingUserEmail";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerUserEmailsUserEmailId(props: {
  customer: CustomerPayload;
  userEmailId: string & tags.Format<"uuid">;
  body: IShoppingUserEmail.IUpdate;
}): Promise<IShoppingUserEmail> {
  const { customer, userEmailId, body } = props;

  // 1. Fetch the user email and check ownership
  const userEmail = await MyGlobal.prisma.shopping_user_emails.findUnique({
    where: { id: userEmailId },
  });
  if (!userEmail || userEmail.shopping_customer_id !== customer.id) {
    throw new HttpException("User email not found or unauthorized", 404);
  }

  // 2. Check for soft-deleted (deleted_at)
  if (userEmail.deleted_at !== null) {
    throw new HttpException("Cannot update deleted user email record", 400);
  }

  // 3. If updating is_primary to true, demote all other emails
  if (body.is_primary === true) {
    await MyGlobal.prisma.shopping_user_emails.updateMany({
      where: {
        shopping_customer_id: customer.id,
        is_primary: true,
        id: { not: userEmailId },
        deleted_at: null,
      },
      data: { is_primary: false },
    });
  }

  // 4. Attempt update, catch unique constraint violation
  let updated: typeof userEmail;
  try {
    updated = await MyGlobal.prisma.shopping_user_emails.update({
      where: { id: userEmailId },
      data: {
        ...(body.email !== undefined && { email: body.email }),
        ...(body.is_verified !== undefined && {
          is_verified: body.is_verified,
        }),
        ...(body.is_primary !== undefined && { is_primary: body.is_primary }),
        ...(body.updated_at !== undefined && { updated_at: body.updated_at }),
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Email address already in use", 409);
    }
    throw err;
  }

  // 5. Map DB record to DTO
  return {
    id: updated.id,
    shopping_customer_id: updated.shopping_customer_id ?? undefined,
    shopping_seller_id: updated.shopping_seller_id ?? undefined,
    email: updated.email,
    is_verified: updated.is_verified,
    is_primary: updated.is_primary,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
