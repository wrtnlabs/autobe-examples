import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEconomicForumAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string;
}): Promise<IEconomicForumAdmin> {
  // Verify adminId matches the authenticated admin's ID
  if (props.admin.id !== props.adminId) {
    throw new HttpException("Unauthorized: Cannot access other admins", 403);
  }
  // Query for admin record by ID, ensuring it's not deleted
  const admin = await MyGlobal.prisma.economic_forum_admins.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  // If admin not found or is deleted, return 404
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }
  // Generate token with proper date formatting using toISOStringSafe
  const currentTime = new Date();
  const accessExpiresAt = new Date(currentTime.getTime() + 15 * 60 * 1000);
  const refreshExpiresAt = new Date(
    currentTime.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        id: admin.id,
        type: "admin",
        session_id: admin.id,
      },
      "jwt-secret",
      {
        expiresIn: "15m",
      },
    ),
    refresh: jwt.sign(
      {
        id: admin.id,
        type: "admin",
      },
      "refresh-secret",
      {
        expiresIn: "7d",
      },
    ),
    expired_at: toISOStringSafe(accessExpiresAt),
    refreshable_until: toISOStringSafe(refreshExpiresAt),
  };
  return {
    id: admin.id,
    token,
  };
}
