import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IEconPoliticalForumModerator.ICreate;
}): Promise<IEconPoliticalForumModerator.IAuthorized> {
  const { body } = props;

  try {
    // Check for existing username or email
    const existing =
      await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
        where: {
          OR: [{ username: body.username }, { email: body.email }],
        },
      });

    if (existing) {
      throw new HttpException(
        "Conflict: username or email already in use",
        409,
      );
    }

    const passwordHash = await PasswordUtil.hash(body.password);

    const id = v4() as string & tags.Format<"uuid">;
    const now = toISOStringSafe(new Date());

    const created =
      await MyGlobal.prisma.econ_political_forum_registereduser.create({
        data: {
          id,
          username: body.username,
          email: body.email,
          password_hash: passwordHash,
          display_name: body.display_name ?? null,
          bio: null,
          avatar_uri: null,
          is_banned: false,
          banned_until: null,
          email_verified: false,
          verified_at: null,
          failed_login_attempts: 0,
          locked_until: null,
          last_login_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

    const accessExpiry = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
    const refreshExpiry = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    const access = jwt.sign(
      { id: created.id, type: "registereduser", email: created.email },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refresh = jwt.sign(
      { id: created.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    return {
      id: created.id as string & tags.Format<"uuid">,
      token: {
        access,
        refresh,
        expired_at: accessExpiry,
        refreshable_until: refreshExpiry,
      },
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException(
        "Conflict: username or email already in use",
        409,
      );
    }
    if (e instanceof HttpException) throw e;
    throw new HttpException("Internal Server Error", 500);
  }
}
