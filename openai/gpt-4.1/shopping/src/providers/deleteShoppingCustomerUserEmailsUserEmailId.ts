import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerUserEmailsUserEmailId(props: {
  customer: CustomerPayload;
  userEmailId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the user email record by its unique id
  const record = await MyGlobal.prisma.shopping_user_emails.findUnique({
    where: { id: props.userEmailId },
  });
  if (!record) {
    throw new HttpException("User email not found", 404);
  }

  // 2. Authorization: Only the owner (shopping_customer_id) can delete
  if (record.shopping_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own secondary emails",
      403,
    );
  }

  // 3. Business rule: Cannot delete primary or verified emails
  if (record.is_primary) {
    throw new HttpException("Cannot delete primary user email.", 400);
  }
  if (record.is_verified) {
    throw new HttpException("Cannot delete a verified email.", 400);
  }

  // 4. Hard delete the email record
  await MyGlobal.prisma.shopping_user_emails.delete({
    where: { id: props.userEmailId },
  });
}
