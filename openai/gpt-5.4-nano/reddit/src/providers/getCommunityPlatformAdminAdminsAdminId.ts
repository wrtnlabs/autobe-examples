import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdmin> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_admins.findFirstOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const target =
    await MyGlobal.prisma.community_platform_admins.findFirstOrThrow({
      where: {
        id: props.adminId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: target.id,
    email: target.email,
    created_at: toISOStringSafe(target.created_at),
    updated_at: toISOStringSafe(target.updated_at),
    deleted_at:
      target.deleted_at === null ? null : toISOStringSafe(target.deleted_at),
  };
}
