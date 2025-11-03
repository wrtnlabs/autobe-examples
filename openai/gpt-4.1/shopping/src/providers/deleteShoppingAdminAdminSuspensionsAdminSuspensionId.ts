import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminAdminSuspensionsAdminSuspensionId(props: {
  admin: AdminPayload;
  adminSuspensionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Check for protected/reserved UUID (e.g., "00000000-0000-0000-0000-000000000001")
  if (props.adminSuspensionId === "00000000-0000-0000-0000-000000000001") {
    throw new HttpException(
      "Cannot delete protected or reserved admin suspension record",
      403,
    );
  }

  // Step 2: Ensure the record exists before deleting
  const record = await MyGlobal.prisma.shopping_admin_suspensions.findUnique({
    where: { id: props.adminSuspensionId },
  });
  if (!record) {
    throw new HttpException("Admin suspension record not found", 404);
  }

  // Step 3: Perform hard delete
  await MyGlobal.prisma.shopping_admin_suspensions.delete({
    where: { id: props.adminSuspensionId },
  });
}
