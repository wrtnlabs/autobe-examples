import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const { adminId } = props;

  const adminRecord =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role_level: true,
        is_active: true,
        email_verified: true,
        mfa_enabled: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    name: adminRecord.name,
    role_level: adminRecord.role_level,
    is_active: adminRecord.is_active,
    email_verified: adminRecord.email_verified,
    mfa_enabled: adminRecord.mfa_enabled,
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
  };
}
