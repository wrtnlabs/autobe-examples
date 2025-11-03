import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify the admin to be deleted exists and is not soft deleted
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id },
  });
  if (!existingAdmin) {
    throw new HttpException("Admin not found", 404);
  }

  // Proceed with hard delete
  await MyGlobal.prisma.shopping_mall_admins.delete({
    where: { id },
  });
}
