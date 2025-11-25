import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: ICommunityBBSAdmin.ICreate;
}): Promise<ICommunityBBSAdmin.IAuthorized> {
  // Since ICommunityBBSAdmin.ICreate is string, parse as JSON to extract email and password
  let bodyJson: { email: string; password: string };
  try {
    bodyJson = JSON.parse(props.body as string);
  } catch {
    throw new HttpException("Invalid JSON format in request body", 400);
  }

  // Validate that required fields exist
  if (!bodyJson.email || typeof bodyJson.email !== "string") {
    throw new HttpException("Email is required and must be a string", 400);
  }
  if (!bodyJson.password || typeof bodyJson.password !== "string") {
    throw new HttpException("Password is required and must be a string", 400);
  }

  // Extract username from email (part before @)
  const username = bodyJson.email.split("@")[0];

  // Check for existing admin with same email
  const existingAdmin = await MyGlobal.prisma.community_bbs_admin.findFirst({
    where: { email: bodyJson.email },
  });

  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(bodyJson.password);

  // Create admin record
  const admin = await MyGlobal.prisma.community_bbs_admin.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: bodyJson.email,
      username: username,
      password_hash: hashedPassword,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.community_bbs_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_bbs_admin_id: admin.id,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
      ip: "",
      href: "",
      referrer: "",
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
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
    id: admin.id,
    token,
  } satisfies ICommunityBBSAdmin.IAuthorized;
}
