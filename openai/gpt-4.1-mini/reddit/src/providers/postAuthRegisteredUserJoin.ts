import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postAuthRegisteredUserJoin(props: {
  registeredUser: RegistereduserPayload;
  body: IRedditCommunityRegisteredUser.ICreate;
}): Promise<IRedditCommunityRegisteredUser.IAuthorized> {
  const existingUser =
    await MyGlobal.prisma.reddit_community_registeredusers.findFirst({
      where: { email: props.body.email },
    });
  if (existingUser !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const nowDate = new Date();
  const now = toISOStringSafe(nowDate);

  const newUserId = v4() as string & tags.Format<"uuid">;

  const createdUser =
    await MyGlobal.prisma.reddit_community_registeredusers.create({
      data: {
        id: newUserId,
        email: props.body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  const accessExpireMs = 60 * 60 * 1000; // 1 hour
  const refreshExpireMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + accessExpireMs),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + refreshExpireMs),
  );

  const newSessionId = v4() as string & tags.Format<"uuid">;

  const createdSession =
    await MyGlobal.prisma.reddit_community_registereduser_sessions.create({
      data: {
        id: newSessionId,
        reddit_community_registereduser_id: createdUser.id,
        created_at: now,
        expired_at: accessExpiredAt,
        ip: "",
        href: "",
        referrer: "",
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "registereduser",
        id: createdUser.id,
        session_id: createdSession.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "registereduser",
        id: createdUser.id,
        session_id: createdSession.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  return {
    id: createdUser.id,
    email: createdUser.email,
    created_at: toISOStringSafe(createdUser.created_at),
    updated_at: toISOStringSafe(createdUser.updated_at),
    deleted_at:
      createdUser.deleted_at !== null
        ? toISOStringSafe(createdUser.deleted_at)
        : null,
    token,
  };
}
