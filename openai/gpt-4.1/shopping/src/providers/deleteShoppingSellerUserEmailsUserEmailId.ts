import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingSellerUserEmailsUserEmailId(props: {
  seller: SellerPayload;
  userEmailId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the user email record by id
  const userEmail = await MyGlobal.prisma.shopping_user_emails.findUnique({
    where: { id: props.userEmailId },
  });
  if (!userEmail) {
    throw new HttpException("User email not found", 404);
  }
  // 2. Check this email belongs to seller
  if (userEmail.shopping_seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own email records",
      403,
    );
  }
  // 3. Do not allow deleting the primary email
  if (userEmail.is_primary) {
    throw new HttpException("Cannot delete primary (login) email", 400);
  }
  // 4. Do not allow deleting verified email
  if (userEmail.is_verified) {
    throw new HttpException("Cannot delete a verified email address", 400);
  }
  // 5. Hard delete the email record
  await MyGlobal.prisma.shopping_user_emails.delete({
    where: { id: props.userEmailId },
  });
}
