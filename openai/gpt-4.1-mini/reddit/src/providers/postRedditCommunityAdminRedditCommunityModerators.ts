import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunityModerators(props: {
  admin: AdminPayload;
  body: IRedditCommunityModerator.ICreate;
}): Promise<IRedditCommunityModerator> {
  const existingModerator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { email: props.body.email },
    });

  if (existingModerator !== null) {
    throw new HttpException(
      `Moderator with email ${props.body.email} already exists`,
      400,
    );
  }

  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.reddit_community_moderators.create({
    data: {
      id,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    email: created.email,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? null
        : toISOStringSafe(created.deleted_at),
  };
}
