import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminUserEmailsUserEmailId(props: {
  admin: AdminPayload;
  userEmailId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the user email record
  const email = await MyGlobal.prisma.shopping_user_emails.findUnique({
    where: { id: props.userEmailId },
  });
  if (!email) {
    throw new HttpException("User email not found", 404);
  }
  // 2. Business validation: Cannot delete primary or verified email
  if (email.is_primary) {
    throw new HttpException("Cannot delete primary email", 400);
  }
  if (email.is_verified) {
    throw new HttpException("Cannot delete verified email", 400);
  }
  // 3. Hard delete (permanent removal)
  await MyGlobal.prisma.shopping_user_emails.delete({
    where: { id: props.userEmailId },
  });
}
