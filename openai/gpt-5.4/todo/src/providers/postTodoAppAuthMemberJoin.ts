import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberJoin(props: {
  ip: string;
  body: ITodoAppMember.IJoin;
}): Promise<ITodoAppMember.IAuthorized> {
  const normalizedEmail = props.body.email.trim().toLowerCase();
  const normalizedPassword = props.body.password.trim();
  if (normalizedEmail.length === 0) {
    throw new HttpException("Email is required", 400);
  }
  if (normalizedPassword.length === 0) {
    throw new HttpException("Password is required", 400);
  }
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      email: normalizedEmail,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const verificationExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const member = await tx.todo_app_members.create({
        data: {
          id: v4(),
          email: normalizedEmail,
          password_hash: await PasswordUtil.hash(props.body.password),
          email_verified: false,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        ...TodoAppMemberTransformer.select(),
      });
      const session = await tx.todo_app_member_sessions.create({
        data: {
          id: v4(),
          member: {
            connect: {
              id: member.id,
            },
          },
          ip: props.body.ip ?? props.ip,
          href: props.body.href,
          referrer: props.body.referrer,
          created_at: now,
          expired_at: accessExpires,
        },
        select: {
          id: true,
        },
      });
      await tx.todo_app_member_email_verifications.create({
        data: {
          id: v4(),
          member: {
            connect: {
              id: member.id,
            },
          },
          token: v4(),
          expired_at: verificationExpires,
          used_at: null,
          revoked_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      return {
        member,
        session,
      };
    });
    const token = {
      access: jwt.sign(
        {
          type: "member",
          id: created.member.id,
          session_id: created.session.id,
          created_at: now.toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "member",
          id: created.member.id,
          session_id: created.session.id,
          tokenType: "refresh",
          created_at: now.toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at:
        now.toISOString() < accessExpires.toISOString()
          ? accessExpires.toISOString()
          : accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken;
    return {
      ...(await TodoAppMemberTransformer.transform(created.member)),
      token,
    } satisfies ITodoAppMember.IAuthorized;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Email already registered", 409);
    }
    throw error;
  }
}
