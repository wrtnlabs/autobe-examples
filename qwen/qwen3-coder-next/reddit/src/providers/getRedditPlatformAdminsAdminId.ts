import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminsAdminId(props: {
  adminId: string;
}): Promise<IRedditPlatformAdmin> {
  const admin = await MyGlobal.prisma.reddit_platform_admins.findUnique({
    where: {
      id: props.adminId,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      email_verified: true,
    },
  });
  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    password_hash: admin.password_hash,
    username: admin.username,
    display_name: admin.display_name,
    bio: admin.bio,
    avatar_url: admin.avatar_url,
    karma_score: admin.karma_score,
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: admin.deleted_at
      ? (toISOStringSafe(admin.deleted_at) as string & tags.Format<"date-time">)
      : null,
    email_verified: admin.email_verified,
  };
}
