import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCitizenJoin(props: {
  body: IPoliticalForumCitizen.ICreate;
}): Promise<IPoliticalForumCitizen.IAuthorized> {
  // Since IPoliticalForumCitizen.ICreate is defined as string in the schema,
  // we cannot access properties like email, password, or display_name directly.
  // The body parameter is a string representation of the registration data.

  // This implementation will handle the string-based registration data.
  // We need to parse the string to extract email, password, display_name information.
  // This might be in JSON format.

  let parsedBody;
  try {
    parsedBody = JSON.parse(props.body);
  } catch (e) {
    throw new HttpException("Invalid registration data format", 400);
  }

  // Extract required fields from parsed JSON
  const email = parsedBody.email;
  const password = parsedBody.password;
  const displayName = parsedBody.display_name;

  // Validate required fields are present
  if (!email || !password) {
    throw new HttpException("Email and password are required", 400);
  }

  // 1. Check for duplicate email
  const existingCitizen =
    await MyGlobal.prisma.political_forum_citizens.findFirst({
      where: { email },
    });

  if (existingCitizen) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Hash password (MANDATORY)
  const hashedPassword = await PasswordUtil.hash(password);

  // 3. Create citizen record
  const citizen = await MyGlobal.prisma.political_forum_citizens.create({
    data: {
      id: v4(),
      email,
      password_hash: hashedPassword,
      display_name: displayName || email.split("@")[0],
      created_at: toISOStringSafe(new Date()),
      email_verified: false,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Create session record
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.political_forum_citizen_sessions.create(
    {
      data: {
        id: v4(),
        citizen: { connect: { id: citizen.id } },
        ip: (parsedBody.ip ?? "") as string,
        href: (parsedBody.href ?? "") as string,
        referrer: (parsedBody.referrer ?? "") as string,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
      },
    },
  );

  // 5. Generate JWT tokens
  const now = toISOStringSafe(new Date());

  const token = {
    access: jwt.sign(
      {
        type: "citizen",
        id: citizen.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "citizen",
        id: citizen.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // 6. Return authorized response
  return {
    id: citizen.id,
    email: citizen.email,
    display_name: citizen.display_name ?? "",
    email_verified: false,
    access_token: token.access,
    refresh_token: token.refresh,
    token,
  } satisfies IPoliticalForumCitizen.IAuthorized;
}
