import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthRegisteredUserJoin(props: {
  body: IDiscussionBoardRegisteredUser.ICreate;
}): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  const parsedBody = JSON.parse(props.body) as {
    username: string;
    email: string;
    password: string;
  };

  const { username, email, password } = parsedBody;

  // Validate input formats
  if (typeof username !== "string" || username.trim().length === 0) {
    throw new HttpException("Invalid username", 400);
  }
  if (typeof email !== "string" || !email.includes("@")) {
    throw new HttpException("Invalid email", 400);
  }
  if (typeof password !== "string" || password.length < 8) {
    // Simplified validation for password length
    throw new HttpException("Password must be at least 8 characters", 400);
  }

  // Check for existing user
  const existingUser =
    await MyGlobal.prisma.discussion_board_registered_users.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });
  if (existingUser) {
    if (existingUser.username === username) {
      throw new HttpException("Username already taken", 409);
    }
    if (existingUser.email === email) {
      throw new HttpException("Email already registered", 409);
    }
  }

  // Hash password
  const passwordHash = await PasswordUtil.hash(password);

  // Create user record
  const user = await MyGlobal.prisma.discussion_board_registered_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      username,
      email,
      password_hash: passwordHash,
      is_active: true,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Generate tokens
  const now = new Date();
  const accessToken = jwt.sign(
    {
      type: "registered_user",
      id: user.id,
      session_id: v4() as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "registered_user",
      id: user.id,
      session_id: v4() as string & tags.Format<"uuid">,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(now.getTime() + 60 * 60 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  };
}
