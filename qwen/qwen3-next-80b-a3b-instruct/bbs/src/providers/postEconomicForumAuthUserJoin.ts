import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { EconomicForumUserCollector } from "../collectors/EconomicForumUserCollector";
import { EconomicForumUserTransformer } from "../transformers/EconomicForumUserTransformer";

export async function postEconomicForumAuthUserJoin(props: {
  body: IEconomicForumUser.IJoin;
}): Promise<IEconomicForumUser.IAuthorized> {
  // Verify user doesn't already exist
  const existingUser = await MyGlobal.prisma.economic_forum_users.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }
  // Create user using the collector pattern since IJoin is empty
  const user = await MyGlobal.prisma.economic_forum_users.create({
    data: await EconomicForumUserCollector.collect({
      body: props.body,
    }),
    ...EconomicForumUserTransformer.select(),
  });
  // Create email verification record
  const verificationToken = v4();
  const validUntil = new Date(Date.now() + 86400000); // 24 hours
  await MyGlobal.prisma.economic_forum_user_email_verifications.create({
    data: {
      id: v4(),
      token: verificationToken,
      user: { connect: { id: user.id } },
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(validUntil),
    },
  });
  // Create user session
  const accessExpires = new Date(Date.now() + 3600000); // 1 hour
  const refreshExpires = new Date(Date.now() + 604800000); // 7 days
  const session = await MyGlobal.prisma.economic_forum_user_sessions.create({
    data: {
      id: v4(),
      user_id: user.id,
      ip: "0.0.0.0",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return authorized user response using the transformer
  const response: IEconomicForumUser.IAuthorized = {
    ...(await EconomicForumUserTransformer.transform(user)),
    token,
  };
  return response;
}
