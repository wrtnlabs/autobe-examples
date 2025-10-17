import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IEconDiscussModerator.ICreate;
}): Promise<IEconDiscussModerator.IAuthorized> {
  const { body } = props;

  const emailNormalized = body.email.trim().toLowerCase();

  const exists = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { email: emailNormalized },
    select: { id: true },
  });
  if (exists) {
    throw new HttpException("Conflict: Email already in use", 409);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const userId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const moderatorId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  const passwordHash = await PasswordUtil.hash(body.password);

  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.econ_discuss_users.create({
        data: {
          id: userId,
          email: emailNormalized,
          password_hash: passwordHash,
          display_name: body.display_name,
          avatar_uri: body.avatar_uri ?? null,
          timezone: body.timezone ?? null,
          locale: body.locale ?? null,
          email_verified: false,
          mfa_enabled: false,
          mfa_secret: null,
          mfa_recovery_codes: null,
          created_at: now,
          updated_at: now,
        },
      });

      await tx.econ_discuss_moderators.create({
        data: {
          id: moderatorId,
          user_id: userId,
          enforced_2fa: true,
          created_at: now,
          updated_at: now,
        },
      });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Conflict: Email already exists", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }

  const access = jwt.sign(
    {
      userId: userId,
      role: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      userId: userId,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expired_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshable_until: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at,
    refreshable_until,
  };

  return {
    id: userId,
    token,
    role: "moderator",
    display_name: body.display_name,
    email_verified: false,
    mfa_enabled: false,
    timezone: body.timezone ?? null,
    locale: body.locale ?? null,
    avatar_uri: body.avatar_uri ?? null,
  };
}
