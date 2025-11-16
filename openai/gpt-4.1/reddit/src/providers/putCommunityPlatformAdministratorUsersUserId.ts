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

export async function putCommunityPlatformAdministratorUsersUserId(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUser.IUpdate;
}): Promise<ICommunityPlatformUser> {
  // 1. Look up existing user by id
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  // 2. Enforce uniqueness constraint for email, if provided and changed
  if (typeof props.body.email === "string" && props.body.email !== user.email) {
    const existing = await MyGlobal.prisma.community_platform_users.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.userId },
      },
    });
    if (existing) {
      throw new HttpException("Email is already in use by another user", 409);
    }
  }

  // 3. Inline update object with only mutable fields
  const updated = await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.userId },
    data: {
      ...(typeof props.body.email === "string" && { email: props.body.email }),
      ...(typeof props.body.status === "string" && {
        status: props.body.status,
      }),
      ...(props.body.business_status !== undefined
        ? { business_status: props.body.business_status }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    status: updated.status,
    ...(updated.business_status !== undefined
      ? { business_status: updated.business_status }
      : {}),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(updated.deleted_at !== undefined
      ? {
          deleted_at:
            updated.deleted_at === null
              ? null
              : toISOStringSafe(updated.deleted_at),
        }
      : {}),
  };
}
