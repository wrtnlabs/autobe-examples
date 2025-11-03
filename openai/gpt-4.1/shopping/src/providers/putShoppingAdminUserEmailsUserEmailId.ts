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

export async function putShoppingAdminUserEmailsUserEmailId(props: {
  admin: AdminPayload;
  userEmailId: string & tags.Format<"uuid">;
  body: IShoppingUserEmail.IUpdate;
}): Promise<IShoppingUserEmail> {
  // Step 1: Authorization - the presence of admin param is enforced by controller, check is for future extension
  const { userEmailId, body } = props;

  // Step 2: Fetch existing record and ensure it is not soft-deleted
  const existing = await MyGlobal.prisma.shopping_user_emails.findUnique({
    where: { id: userEmailId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException(
      "User email record not found or already deleted.",
      404,
    );
  }

  // Step 3: Prepare update payload (only fields in body)
  // updated_at should be always set to now if not supplied
  const updateData = {
    email: body.email ?? undefined,
    is_verified: body.is_verified ?? undefined,
    is_primary: body.is_primary ?? undefined,
    updated_at: body.updated_at ?? toISOStringSafe(new Date()),
  };

  // Step 4: Execute Prisma update
  let updated;
  try {
    updated = await MyGlobal.prisma.shopping_user_emails.update({
      where: { id: userEmailId },
      data: updateData,
    });
  } catch (error) {
    // Unique constraint violation (attempting to set a duplicate email)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === "P2002"
    ) {
      throw new HttpException("Email address already exists.", 409);
    }
    throw error;
  }

  // Step 5: Return mapped DTO (correct branding, opt/null rules, NEVER Date type, never 'as')
  return {
    id: updated.id,
    shopping_customer_id:
      updated.shopping_customer_id === null
        ? undefined
        : updated.shopping_customer_id,
    shopping_seller_id:
      updated.shopping_seller_id === null
        ? undefined
        : updated.shopping_seller_id,
    email: updated.email,
    is_verified: updated.is_verified,
    is_primary: updated.is_primary,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || typeof updated.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
