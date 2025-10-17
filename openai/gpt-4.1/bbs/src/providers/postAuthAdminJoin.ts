import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: IDiscussionBoardAdmin.ICreate;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const password_hash = await PasswordUtil.hash(body.password);
  const id = v4();

  try {
    const created = await MyGlobal.prisma.discussion_board_admins.create({
      data: {
        id: id,
        email: body.email,
        username: body.username,
        password_hash: password_hash,
        email_verified: false,
        registration_completed_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    const accessTokenExpiresIn = 60 * 60; // 1 hour
    const refreshTokenExpiresIn = 60 * 60 * 24 * 7; // 7 days
    const accessTokenExpireAt = toISOStringSafe(
      new Date(Date.now() + accessTokenExpiresIn * 1000),
    );
    const refreshTokenExpireAt = toISOStringSafe(
      new Date(Date.now() + refreshTokenExpiresIn * 1000),
    );

    const access = jwt.sign(
      {
        id: created.id,
        type: "admin",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: accessTokenExpiresIn,
        issuer: "autobe",
      },
    );
    const refresh = jwt.sign(
      {
        id: created.id,
        type: "admin",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: refreshTokenExpiresIn,
        issuer: "autobe",
      },
    );

    return {
      id: created.id,
      email: created.email,
      username: created.username,
      email_verified: created.email_verified,
      registration_completed_at: toISOStringSafe(
        created.registration_completed_at,
      ),
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
      token: {
        access,
        refresh,
        expired_at: accessTokenExpireAt,
        refreshable_until: refreshTokenExpireAt,
      },
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Duplicate email or username.", 409);
    }
    throw new HttpException("Internal server error", 500);
  }
}
