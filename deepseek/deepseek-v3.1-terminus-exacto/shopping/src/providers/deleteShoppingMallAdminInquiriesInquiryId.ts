import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminInquiriesInquiryId(props: {
  admin: AdminPayload;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the inquiry exists
  const inquiry = await MyGlobal.prisma.shopping_mall_inquiries.findUnique({
    where: { id: props.inquiryId },
  });

  if (!inquiry) {
    throw new HttpException("Inquiry not found", 404);
  }

  // Perform hard deletion
  await MyGlobal.prisma.shopping_mall_inquiries.delete({
    where: { id: props.inquiryId },
  });
}
