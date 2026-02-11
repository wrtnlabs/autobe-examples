import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
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

export async function postCommunityAuthAdminJoin(props: {
  body: ICommunityAdmin.IJoin;
}): Promise<ICommunityAdmin.IAuthorized> {
  // 1. Validate email format and password strength
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(props.body.email)) {
    throw new HttpException("Invalid email format", 400);
  }
  if (props.body.password.length < 8) {
    throw new HttpException("Password too short", 400);
  }
  // 2. Check username uniqueness
  const existingUsername = await MyGlobal.prisma.community_admins.findFirst({
    where: { username: props.body.username },
  });
  if (existingUsername) {
    throw new HttpException("Username already taken", 400);
  }
  // 3. Hash password using PasswordUtil
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create community_admins entry
  const admin = await MyGlobal.prisma.community_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password: passwordHash,
      username: props.body.username,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 5. Generate verification token (pseudo code)
  const verificationToken = v4();
  // 6. Return success response with verification expiration
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    display_name: admin.display_name ?? undefined,
    bio: admin.bio ?? undefined,
    avatar_url: admin.avatar_url ?? undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: "",
      refresh: "",
      expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  } satisfies ICommunityAdmin.IAuthorized;
}
