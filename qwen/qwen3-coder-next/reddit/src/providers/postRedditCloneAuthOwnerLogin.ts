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

export async function postRedditCloneAuthOwnerLogin(props: {
  body: IRedditCloneOwner.ILogin;
}): Promise<IRedditCloneOwner.IAuthorized> {
  // 1. Find owner with password_hash
  const owner = await MyGlobal.prisma.reddit_clone_owners.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!owner) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    owner.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create NEW session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_clone_owner_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_clone_owner_id: owner.id,
      access_token: "",
      refresh_token: "",
      expires_at: Math.floor(accessExpires.getTime() / 1000),
      ip: (props.body.ip ?? "") as string,
      user_agent: null,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
      refreshed_at: null,
    },
  });
  // 4. Generate JWT tokens
  const tokenPayload = {
    type: "owner" as const,
    id: owner.id as string & tags.Format<"uuid">,
    session_id: session.id,
    created_at: toISOStringSafe(now),
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized
  return {
    id: owner.id as string & tags.Format<"uuid">,
    token,
  } satisfies IRedditCloneOwner.IAuthorized;
}
