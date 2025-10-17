import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVisitorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitorJoin";
import { IEconDiscussVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitor";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthVisitorJoin(props: {
  body: IEconDiscussVisitorJoin.ICreate;
}): Promise<IEconDiscussVisitor.IAuthorized> {
  const { body } = props;

  const email = body.email.toLowerCase();

  const existing = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Conflict: Email already registered", 409);
  }

  const now = toISOStringSafe(new Date());
  const passwordHash = await PasswordUtil.hash(body.password);

  try {
    const createdUser = await MyGlobal.prisma.$transaction(async (tx) => {
      const user = await tx.econ_discuss_users.create({
        data: {
          id: v4(),
          email,
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
        select: { id: true },
      });

      await tx.econ_discuss_visitors.create({
        data: {
          id: v4(),
          user_id: user.id,
          notes: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

      return user;
    });

    const access = jwt.sign(
      {
        id: createdUser.id,
        type: "visitor",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refresh = jwt.sign(
      {
        id: createdUser.id,
        type: "visitor",
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
    const refreshable_until = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      id: createdUser.id as string & tags.Format<"uuid">,
      token: {
        access,
        refresh,
        expired_at,
        refreshable_until,
      },
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
