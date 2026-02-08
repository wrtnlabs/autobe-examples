import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminsAdminId(props: {
  adminId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdmin.IEntity> {
  const record = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { id: props.adminId },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!record) {
    throw new HttpException("Admin not found", 404);
  }
  return {
    id: record.id,
    email: record.email,
    display_name: record.display_name ?? undefined,
    biography: record.bio ?? undefined,
    avatar_image_url: record.avatar_url ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
