import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdmin> {
  const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Admin not found", 404);
  }
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
  };
}
