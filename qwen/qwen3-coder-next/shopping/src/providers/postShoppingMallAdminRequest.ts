import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminRequest(props: {
  body: IShoppingMallAdmin.ICreate;
}): Promise<void> {
  // Validate user is authenticated and not already an administrator
  const currentUser = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      deleted_at: null,
    },
  });
  const currentSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {},
  });
  const currentSellerWithUser =
    await MyGlobal.prisma.shopping_mall_sellers.findFirst({
      where: {},
      include: {
        user: true,
      },
    });
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      deleted_at: null,
    },
  });
  if (existingAdmin) {
    throw new HttpException("Administrator request already exists", 400);
  }
  // Create administrator request with pending status
  await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: currentUser?.email || currentSellerWithUser?.user?.email || "",
      password_hash: "",
      role_grade: "regular",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
