import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserJoin(props: {
  body: IDiscussionBoardMemberUserJoin.IRequest;
}): Promise<IDiscussionBoardMemberuser.IAuthorized> {
  const body = props.body;

  // 1. Enforce email uniqueness at application level
  const existing = await MyGlobal.prisma.discussion_board_memberusers.findFirst(
    {
      where: {
        email: body.email,
      },
    },
  );

  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Prepare timestamps
  const nowDate = new Date();
  const now = toISOStringSafe(nowDate);

  const lastLoginAtDate = nowDate;
  const lastLoginAt = toISOStringSafe(lastLoginAtDate);

  const accessExpiresDate = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const accessExpiredAt = toISOStringSafe(accessExpiresDate);
  const refreshableUntil = toISOStringSafe(refreshExpiresDate);

  // 3. Hash password
  const hashedPassword = await PasswordUtil.hash(body.password);

  try {
    // 4. Create member user record
    const created = await MyGlobal.prisma.discussion_board_memberusers.create({
      data: {
        id: v4(),
        email: body.email,
        password_hash: hashedPassword,
        display_name: body.displayName,
        bio: body.bio ?? null,
        location: body.location ?? null,
        email_verified: false,
        account_status: "active",
        created_at: nowDate,
        updated_at: nowDate,
        deleted_at: null,
        last_login_at: lastLoginAtDate,
        closed_at: null,
        closed_by_admin: false,
      },
    });

    // 5. Generate JWT tokens
    const accessToken = jwt.sign(
      {
        type: "memberuser",
        id: created.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        type: "memberuser",
        id: created.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    const token: IAuthorizationToken = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    };

    // 6. Map DB entity to API DTO, converting Date fields to ISO strings
    const createdAtIso = toISOStringSafe(created.created_at);
    const updatedAtIso = toISOStringSafe(created.updated_at);
    const deletedAtIso = created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : null;
    const lastLoginAtIso = created.last_login_at
      ? toISOStringSafe(created.last_login_at)
      : null;
    const closedAtIso = created.closed_at
      ? toISOStringSafe(created.closed_at)
      : null;

    const result: IDiscussionBoardMemberuser.IAuthorized = {
      id: created.id,
      email: created.email,
      display_name: created.display_name,
      bio: created.bio ?? null,
      location: created.location ?? null,
      email_verified: created.email_verified,
      account_status: created.account_status,
      created_at: createdAtIso,
      updated_at: updatedAtIso,
      deleted_at: deletedAtIso,
      last_login_at: lastLoginAtIso,
      closed_at: closedAtIso,
      closed_by_admin: created.closed_by_admin,
      token,
    };

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint failed on the email field
        throw new HttpException("Email already registered", 409);
      }
    }

    throw error;
  }
}
