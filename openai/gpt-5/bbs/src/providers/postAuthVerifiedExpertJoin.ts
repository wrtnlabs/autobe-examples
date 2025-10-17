import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthVerifiedExpertJoin(props: {
  body: IEconDiscussVerifiedExpertJoin.ICreate;
}): Promise<IEconDiscussVerifiedExpert.IAuthorized> {
  const { body } = props;

  const normalizedEmail = body.email.trim().toLowerCase();

  const existing = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Conflict: Email already registered", 409);
  }

  const password_hash = await PasswordUtil.hash(body.password);

  const userId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.econ_discuss_users.create({
      data: {
        id: userId,
        email: normalizedEmail,
        password_hash,
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
        deleted_at: null,
      },
    });

    const access = jwt.sign(
      { id: userId, type: "verifiedExpert" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );
    const refresh = jwt.sign(
      { id: userId, type: "verifiedExpert", tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
    const refreshable_until = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      id: userId,
      role: "verifiedExpert",
      token: {
        access,
        refresh,
        expired_at,
        refreshable_until,
      },
      email_verified: false,
      mfa_enabled: false,
      display_name: created.display_name,
      avatar_uri: created.avatar_uri ?? null,
      timezone: created.timezone ?? null,
      locale: created.locale ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Conflict: Email already registered", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
