import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberJoin(props: {
  body: IMemberCreate.IRequest;
}): Promise<ITodoMember.IAuthorized> {
  const { body } = props;

  // Convert email to lowercase for case-insensitive uniqueness
  const email = body.email.toLowerCase();

  // Check for existing member with same email
  const existingMember = await MyGlobal.prisma.todo_member.findUnique({
    where: { email },
  });

  if (existingMember) {
    throw new HttpException(
      "Email already registered. Please use a different email address.",
      409,
    );
  }

  // Hash password securely - never store plain passwords
  const passwordHash = await PasswordUtil.hash(body.password);

  // Generate unique member ID
  const memberId = v4() as string & tags.Format<"uuid">;

  // Get current timestamp for all date operations
  const now = toISOStringSafe(new Date());

  // Create the member record
  const createdMember = await MyGlobal.prisma.todo_member.create({
    data: {
      id: memberId,
      email: email,
      password_hash: passwordHash,
      role: "member",
      session_token: null,
      session_expires_at: null,
      last_login_at: null,
      login_attempts: 0,
      locked_until: null,
      created_at: now,
      updated_at: now,
    },
  });

  // Calculate token expiration times using proper date handling
  const tokenExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const refreshExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Generate JWT tokens using exact payload structure from decoratorEvent
  const accessToken = jwt.sign(
    {
      id: createdMember.id,
      email: createdMember.email,
      role: createdMember.role,
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
      id: createdMember.id,
      email: createdMember.email,
      role: createdMember.role,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorization response with proper type handling
  const response: ITodoMember.IAuthorized = {
    id: createdMember.id,
    email: createdMember.email,
    role: createdMember.role === "member" ? "member" : "admin",
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(tokenExpiration),
      refreshable_until: toISOStringSafe(refreshExpiration),
    },
    last_login_at: createdMember.last_login_at
      ? toISOStringSafe(createdMember.last_login_at)
      : createdMember.last_login_at,
  };

  return response;
}
