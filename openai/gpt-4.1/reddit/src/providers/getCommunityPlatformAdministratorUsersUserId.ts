import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorUsersUserId(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUser> {
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    status: user.status,
    business_status:
      user.business_status === null ||
      typeof user.business_status === "undefined"
        ? undefined
        : user.business_status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      typeof user.deleted_at === "undefined" || user.deleted_at === null
        ? undefined
        : toISOStringSafe(user.deleted_at),
  };
}
