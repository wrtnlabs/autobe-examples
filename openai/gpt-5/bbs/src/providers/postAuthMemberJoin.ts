import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberJoin(props: {
  body: IEconDiscussMember.ICreate;
}): Promise<IEconDiscussMember.IAuthorized> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const accessExp = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExp = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const userId = v4() as string & tags.Format<"uuid">;
  const memberId = v4() as string & tags.Format<"uuid">;

  const emailLower = body.email.toLowerCase();

  const passwordHash = await PasswordUtil.hash(body.password);

  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.econ_discuss_users.create({
        data: {
          id: userId,
          email: emailLower,
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
          deleted_at: null,
        },
      });

      await tx.econ_discuss_members.create({
        data: {
          id: memberId,
          user_id: userId,
          joined_at: now,
          created_at: now,
          updated_at: now,
          deleted_at: null,
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
    { id: userId, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    { id: userId, type: "member", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: userId,
    token: {
      access,
      refresh,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
    member: {
      id: userId,
      displayName: body.display_name,
      avatarUri: (body.avatar_uri ?? undefined) satisfies string | undefined as
        | string
        | undefined,
      timezone: body.timezone ?? undefined,
      locale: body.locale ?? undefined,
      emailVerified: false,
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    },
  };
}
