import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function postRedditCommunityRedditCommunityRegisteredusers(props: {
  body: IRedditCommunityRegisteredUser.ICreate;
}): Promise<IRedditCommunityRegisteredUser> {
  const existingUser =
    await MyGlobal.prisma.reddit_community_registeredusers.findUnique({
      where: { email: props.body.email },
    });
  if (existingUser !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now: string = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.reddit_community_registeredusers.create(
    {
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );
  return {
    id: created.id,
    email: created.email,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
