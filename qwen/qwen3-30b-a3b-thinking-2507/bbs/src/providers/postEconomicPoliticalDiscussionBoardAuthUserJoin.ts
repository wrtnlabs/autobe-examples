import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardAuthUserJoin(props: {
  body: IEconomicPoliticalDiscussionBoardUser.IJoin;
}): Promise<IEconomicPoliticalDiscussionBoardUser.IAuthorized> {
  // 1. Check duplicate account
  const existing =
    await MyGlobal.prisma.economic_political_discussion_board_users.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create user (manual since collector not available)
  const user =
    await MyGlobal.prisma.economic_political_discussion_board_users.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: props.body.password,
        role: "user",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  // 3. Create email verification token with 15-minute expiration
  const verificationToken = v4();
  const expiresAt = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  await MyGlobal.prisma.economic_political_discussion_board_user_email_verifications.create(
    {
      data: {
        id: v4(),
        token: verificationToken,
        user_id: user.id,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      },
    },
  );
  // 4. Generate JWT token valid for 24 hours
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: v4(),
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: v4(),
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 5. Return IAuthorized
  return {
    user: {
      id: user.id,
      email: user.email,
      role: "user",
    },
    token,
  };
}
