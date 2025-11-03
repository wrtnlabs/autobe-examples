import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function postRedditCommunityUsers(props: {
  body: IRedditCommunityUser.ICreate;
}): Promise<IRedditCommunityUser> {
  const { body } = props;
  // Check if email already exists
  const existingUser = await MyGlobal.prisma.reddit_community_user.findUnique({
    where: { email: body.email },
    select: { id: true },
  });
  if (existingUser !== null) {
    throw new HttpException("Conflict: Email already exists", 409);
  }

  // Hash the password
  const passwordHash = await PasswordUtil.hash(body.password);

  // Generate new UUID for id
  const newId = v4() as string & tags.Format<"uuid">;

  // Current timestamp
  const now = toISOStringSafe(new Date());

  // Create new user
  const created = await MyGlobal.prisma.reddit_community_user.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
    },
  });

  // Return user object conforming to IRedditCommunityUser
  return {
    user_id: created.id,
    post_upvotes: 0,
    post_downvotes: 0,
    comment_upvotes: 0,
    comment_downvotes: 0,
    total_karma: 0,
  };
}
