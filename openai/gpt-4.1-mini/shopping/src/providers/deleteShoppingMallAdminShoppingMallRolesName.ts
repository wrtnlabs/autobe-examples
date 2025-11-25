import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallRolesName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_roles.findUnique({
    where: { name: props.name },
  });

  if (!existing) {
    throw new HttpException(`Role with name '${props.name}' not found`, 404);
  }

  await MyGlobal.prisma.shopping_mall_roles.delete({
    where: { name: props.name },
  });
}
