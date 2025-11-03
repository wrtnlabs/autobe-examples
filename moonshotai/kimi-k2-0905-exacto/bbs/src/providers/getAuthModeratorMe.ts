import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getAuthModeratorMe(props: {
  moderator: ModeratorPayload;
}): Promise<IPoliticsBbsModerator> {
  // Fetch moderator profile data validating deletion state
  const moderator =
    await MyGlobal.prisma.politics_bbs_moderators.findUniqueOrThrow({
      where: {
        id: props.moderator.id,
        deleted_at: null, // Prevents soft-deleted moderators from access
      },
      select: {
        id: true,
        username: true,
        password_hash: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  // Return moderator profile with proper type conversions
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    username: moderator.username,
    password_hash: moderator.password_hash,
    email: moderator.email,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
  };
}
