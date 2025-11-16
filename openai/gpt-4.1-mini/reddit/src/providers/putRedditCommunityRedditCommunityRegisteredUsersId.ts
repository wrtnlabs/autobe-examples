import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putRedditCommunityRedditCommunityRegisteredUsersId(props: {
  registeredUser: RegisteredUserPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityRegisteredUser.IUpdate;
}): Promise<IRedditCommunityRegisteredUser> {
  const existing =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: props.id },
    });

  if (!existing) {
    throw new HttpException("User not found", 404);
  }

  if (existing.id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.reddit_community_registered_users.update({
    where: { id: props.id },
    data: {
      ...(props.body.username !== undefined
        ? { username: props.body.username }
        : {}),
      ...(props.body.email !== undefined ? { email: props.body.email } : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const fullUser =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: props.id },
    });

  if (!fullUser) {
    throw new HttpException("User not found after update", 404);
  }

  return {
    id: fullUser.id,
    email: fullUser.email,
    created_at: toISOStringSafe(fullUser.created_at),
    updated_at: toISOStringSafe(fullUser.updated_at),
    deleted_at:
      fullUser.deleted_at === null
        ? null
        : toISOStringSafe(fullUser.deleted_at),
  };
}
