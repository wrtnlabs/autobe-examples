import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserJoin(props: {
  body: ITodoAppMemberUserJoin.IRequest;
}): Promise<ITodoAppMemberuser.IAuthorized> {
  // Check for duplicate email without exposing database internals
  const existing = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      email: props.body.email,
    },
  });

  if (existing !== null) {
    throw new HttpException("Member user with this email already exists.", 409);
  }

  // Hash the incoming password
  const passwordHash: string = await PasswordUtil.hash(props.body.password);

  // Compute current and expiry timestamps as ISO strings
  const nowDate = new Date();
  const now = toISOStringSafe(nowDate);

  const accessExpiryDate = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const accessExpiresAt = toISOStringSafe(accessExpiryDate);

  const refreshExpiryDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const refreshExpiresAt = toISOStringSafe(refreshExpiryDate);

  // Generate UUIDs for member user and session
  const memberId = v4();
  const sessionId = v4();

  try {
    // Create member user and session within a single transaction
    const [member, session] = await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.todo_app_memberusers.create({
        data: {
          id: memberId,
          email: props.body.email,
          password_hash: passwordHash,
          display_name: props.body.display_name ?? null,
          status: "active",
          failed_login_count: 0,
          last_login_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.todo_app_memberuser_sessions.create({
        data: {
          id: sessionId,
          todo_app_memberuser_id: memberId,
          ip:
            props.body.ip !== undefined && props.body.ip !== null
              ? props.body.ip
              : "0.0.0.0",
          href: props.body.href,
          referrer: props.body.referrer,
          created_at: now,
          expired_at: accessExpiresAt,
        },
      }),
    ]);

    // Generate JWT access and refresh tokens
    const accessToken = jwt.sign(
      {
        type: "memberuser",
        id: member.id,
        session_id: session.id,
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
        id: member.id,
        session_id: session.id,
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
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    };

    return {
      id: member.id,
      email: member.email,
      display_name:
        member.display_name === null ? undefined : member.display_name,
      status: member.status,
      failed_login_count: member.failed_login_count,
      last_login_at:
        member.last_login_at === null
          ? null
          : toISOStringSafe(member.last_login_at),
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at:
        member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
      token,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation (likely email)
      throw new HttpException(
        "Member user with this email already exists.",
        409,
      );
    }

    throw error;
  }
}
