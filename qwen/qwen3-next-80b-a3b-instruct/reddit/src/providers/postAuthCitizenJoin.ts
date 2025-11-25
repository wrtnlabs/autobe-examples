import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postAuthCitizenJoin(props: {
  citizen: CitizenPayload;
  body: ICommunityBBSCitizenICreate;
}): Promise<ICommunityBBSCitizen.IAuthorized> {
  // The function signature indicates that body is ICommunityBBSCitizenICreate which is defined as string
  // This suggests the actual data is passed as a JSON string in the request body

  // Validate body content
  if (!props.body || typeof props.body !== "string") {
    throw new HttpException("Invalid registration data", 400);
  }

  // Parse the JSON string
  let bodyData;
  try {
    bodyData = JSON.parse(props.body);
  } catch (e) {
    throw new HttpException("Invalid JSON format in registration data", 400);
  }

  // Validate required fields
  if (!bodyData.email || !bodyData.username || !bodyData.password) {
    throw new HttpException("Email, username, and password are required", 400);
  }

  // Check for duplicate email
  const existing = await MyGlobal.prisma.community_bbs_citizen.findFirst({
    where: {
      email: bodyData.email,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(bodyData.password);

  // Create actor record with all required fields
  const citizen = await MyGlobal.prisma.community_bbs_citizen.create({
    data: {
      id: v4(),
      email: bodyData.email,
      username: bodyData.username,
      password_hash: hashedPassword,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.community_bbs_citizen_sessions.create({
    data: {
      id: v4(),
      community_bbs_citizen_id: citizen.id,
      ip: bodyData.ip ?? null,
      href: bodyData.href ?? null,
      referrer: bodyData.referrer ?? null,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens
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
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: citizen.id,
    token,
  } satisfies ICommunityBBSCitizen.IAuthorized;
}
