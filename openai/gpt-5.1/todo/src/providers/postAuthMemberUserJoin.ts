import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserJoin(props: {
  body: ITodoAppMemberUserJoin.ICreate;
}): Promise<ITodoAppMemberUser.IAuthorized> {
  // 1. Check for duplicate email based on unique index
  const existing = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: { email: props.body.email },
  });

  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Prepare timestamps using millisecond arithmetic
  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 60 * 60 * 1000; // +1 hour
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // +7 days

  const nowIso = toISOStringSafe(new Date(nowMs));
  const accessExpiresIso = toISOStringSafe(new Date(accessExpiresMs));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpiresMs));

  // 3. Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // 4. Create member user and session records inside a try/catch
  try {
    const memberId = v4();

    const createdMember = await MyGlobal.prisma.todo_app_memberusers.create({
      data: {
        id: memberId,
        email: props.body.email,
        password_hash: hashedPassword,
        display_name: props.body.displayName ?? null,
        status: "active",
        created_at: nowIso,
        updated_at: nowIso,
      },
    });

    const sessionId = v4();
    const sessionIp = props.body.ip ?? "";

    const createdSession =
      await MyGlobal.prisma.todo_app_memberuser_sessions.create({
        data: {
          id: sessionId,
          todo_app_memberuser_id: createdMember.id,
          ip: sessionIp,
          href: props.body.href,
          referrer: props.body.referrer,
          created_at: nowIso,
          expired_at: accessExpiresIso,
        },
      });

    // 5. Generate JWT access and refresh tokens
    const accessToken = jwt.sign(
      {
        type: "memberuser",
        id: createdMember.id,
        session_id: createdSession.id,
        created_at: nowIso,
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
        id: createdMember.id,
        session_id: createdSession.id,
        tokenType: "refresh",
        created_at: nowIso,
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
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    };

    // 6. Map database entity to authorized DTO
    const result: ITodoAppMemberUser.IAuthorized = {
      id: createdMember.id,
      email: createdMember.email,
      display_name: createdMember.display_name ?? null,
      status: createdMember.status,
      created_at: toISOStringSafe(createdMember.created_at),
      updated_at: toISOStringSafe(createdMember.updated_at),
      token,
    };

    return result;
  } catch (error) {
    // Handle potential race-condition duplicate email via unique constraint
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Email already registered", 409);
    }

    throw error;
  }
}
