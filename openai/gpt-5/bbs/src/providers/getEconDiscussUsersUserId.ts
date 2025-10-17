import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";

export async function getEconDiscussUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussUser> {
  const row = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      avatar_uri: true,
      timezone: true,
      locale: true,
      email_verified: true,
      mfa_enabled: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!row) {
    throw new HttpException("Not Found", 404);
  }

  const expert = await MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
    where: {
      user_id: row.id,
      deleted_at: null,
    },
    select: { id: true },
  });

  return {
    id: row.id as string & tags.Format<"uuid">,
    displayName: row.display_name,
    avatarUri:
      row.avatar_uri === null
        ? undefined
        : (row.avatar_uri as string & tags.Format<"uri">),
    timezone: row.timezone === null ? undefined : row.timezone,
    locale: row.locale === null ? undefined : row.locale,
    emailVerified: row.email_verified,
    mfaEnabled: row.mfa_enabled,
    isExpertVerified: !!expert,
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
  };
}
