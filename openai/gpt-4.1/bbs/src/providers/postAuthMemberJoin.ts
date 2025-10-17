import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberJoin(props: {
  body: IDiscussionBoardMember.ICreate;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const now = toISOStringSafe(new Date());
  const id = v4() satisfies string & tags.Format<"uuid">;
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  try {
    const created = await MyGlobal.prisma.discussion_board_members.create({
      data: {
        id,
        email: props.body.email,
        username: props.body.username,
        password_hash: hashedPassword,
        email_verified: false,
        registration_completed_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const accessExpiredAt = toISOStringSafe(
      new Date(Date.now() + 3600 * 1000),
    ) satisfies string & tags.Format<"date-time">;
    const refreshExpiredAt = toISOStringSafe(
      new Date(Date.now() + 7 * 86400 * 1000),
    ) satisfies string & tags.Format<"date-time">;
    const accessToken = jwt.sign(
      {
        id: created.id,
        type: "member",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );
    const refreshToken = jwt.sign(
      {
        id: created.id,
        type: "member",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
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
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiredAt,
        refreshable_until: refreshExpiredAt,
      },
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      if (error.meta && Array.isArray(error.meta.target)) {
        if (error.meta.target.includes("email")) {
          throw new HttpException("This email is already registered.", 409);
        }
        if (error.meta.target.includes("username")) {
          throw new HttpException("This username is already taken.", 409);
        }
      }
      throw new HttpException("Duplicate registration.", 409);
    }
    throw error;
  }
}
