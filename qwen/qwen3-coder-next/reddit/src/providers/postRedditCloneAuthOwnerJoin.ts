import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthOwnerJoin(props: {
  body: IRedditCloneOwner.IJoin;
}): Promise<IRedditCloneOwner.IAuthorized> {
  // 1. Check duplicate email and username
  const existing = await MyGlobal.prisma.reddit_clone_owners.findFirst({
    where: {
      OR: [{ email: props.body.email }, { username: props.body.username }],
    },
  });
  if (existing)
    throw new HttpException("Email or username already exists", 409);
  // 2. Create owner record with hashed password
  const owner = await MyGlobal.prisma.reddit_clone_owners.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      username: props.body.username,
      display_name: props.body.displayName ?? props.body.username,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      created_at: true,
    },
  });
  // 3. Create owner session with proper string timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_clone_owner_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_clone_owner_id: owner.id,
      access_token: v4(),
      refresh_token: v4(),
      expired_at: accessExpires.toISOString(),
      expires_at: Math.floor(refreshExpires.getTime() / 1000),
      ip: "0.0.0.0",
      created_at: new Date().toISOString(),
    },
  });
  // 4. Generate JWT tokens
  const tokenPayload = {
    type: "owner" as const,
    id: owner.id,
    session_id: session.id,
    created_at: new Date().toISOString(),
  };
  const access = jwt.sign(
    {
      ...tokenPayload,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh" as const,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return IAuthorized
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: owner.id,
    token,
  } satisfies IRedditCloneOwner.IAuthorized;
}
