import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminUserRolesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify existence of user role or throw error
  await MyGlobal.prisma.shopping_mall_user_roles.findUniqueOrThrow({
    where: { id },
  });

  // Hard delete user role
  await MyGlobal.prisma.shopping_mall_user_roles.delete({
    where: { id },
  });
}
