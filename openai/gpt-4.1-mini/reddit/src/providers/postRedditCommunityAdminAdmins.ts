import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminAdmins(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.ICreate;
}): Promise<IRedditCommunityAdmin> {
  const { admin, body } = props;
  const now = toISOStringSafe(new Date());

  const user = await MyGlobal.prisma.reddit_community_user.findUnique({
    where: { id: body.user_id },
  });

  if (user === null) {
    throw new HttpException("User not found", 400);
  }

  const existingAdmin = await MyGlobal.prisma.reddit_community_admin.findFirst({
    where: { user_id: body.user_id },
  });

  if (existingAdmin !== null) {
    throw new HttpException("Admin user already exists", 409);
  }

  const id = v4();

  const created = await MyGlobal.prisma.reddit_community_admin.create({
    data: {
      id,
      user_id: body.user_id,
      created_at: now,
    },
  });

  return {
    id: created.id,
    user_id: created.user_id,
    created_at: now,
  };
}
