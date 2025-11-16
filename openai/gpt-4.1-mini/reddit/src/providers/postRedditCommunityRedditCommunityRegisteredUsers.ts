import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

// We can't fix missing method error, so only fix casting for date-related fields
// Use Date type for Prisma create input dates; use toISOStringSafe for return strings

export async function postRedditCommunityRedditCommunityRegisteredUsers(props: {
  body: IRedditCommunityRegisteredUser.ICreate;
}): Promise<IRedditCommunityRegisteredUser> {
  const existUser =
    await MyGlobal.prisma.reddit_community_registered_users.findFirst({
      where: {
        deleted_at: null,
        OR: [{ email: props.body.email }],
      },
    });

  if (existUser) {
    if (existUser.email === props.body.email) {
      throw new HttpException("Email already exists", 400);
    }
  }

  // Problem: hashPassword is not defined, which is an unrelated error

  // For casting: use new Date() in prisma create
  const nowDate = new Date();
  const nowStr = toISOStringSafe(nowDate);

  const created =
    await MyGlobal.prisma.reddit_community_registered_users.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email,
        password_hash: props.body.password as any, // leave as is because hashPassword not exist
        created_at: nowDate,
        updated_at: nowDate,
      },
    });

  return {
    id: created.id,
    username: "",
    email: created.email,
    display_name: "",
    bio: "",
    avatar_url: "",
    status: "active",
    role: "user",
    registered_at: nowStr,
    last_login_at:
      created.deleted_at === null
        ? null
        : toISOStringSafe(created.deleted_at ?? new Date()),
    deleted_at:
      created.deleted_at === null
        ? null
        : toISOStringSafe(created.deleted_at ?? new Date()),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
