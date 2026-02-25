import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminAtSummaryUserTransformer } from "../transformers/ShoppingMallAdminAtSummaryUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdministrators(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.ICreate;
}): Promise<IShoppingMallAdmin> {
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Administrator request already exists", 409);
  }
  // Look up admin's email from database
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.admin.id },
    select: { email: true },
  });
  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }
  const now = new Date();
  const created = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: props.admin.id,
      email: adminRecord.email,
      password_hash: "", // Temporary placeholder
      role_grade: "pending",
      created_at: now,
      updated_at: now,
    },
    ...ShoppingMallAdminAtSummaryUserTransformer.select(),
  });
  const transformed =
    await ShoppingMallAdminAtSummaryUserTransformer.transform(created);
  // Convert email to correct format type for customer summary
  const emailAsFormat = adminRecord.email as string & tags.Format<"email">;
  return {
    ...transformed,
    created_at: toISOStringSafe(now),
    status: "pending",
    requester: {
      id: props.admin.id,
      email: emailAsFormat,
      display_name: null,
      phone_number: null,
      email_verified: false,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    } satisfies IShoppingMallCustomer.ISummary,
    reason: props.body.reason,
  };
}
