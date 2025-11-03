import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminPaymentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;
  // Ensure record exists
  await MyGlobal.prisma.shopping_mall_payments.findUniqueOrThrow({
    where: { id },
  });

  // Delete the payment record hard delete
  await MyGlobal.prisma.shopping_mall_payments.delete({
    where: { id },
  });
}
