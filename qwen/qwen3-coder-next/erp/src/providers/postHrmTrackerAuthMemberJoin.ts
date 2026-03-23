import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerAuthMemberJoin(props: {
  ip: string;
  body: IHrmTrackerMember.IJoin;
}): Promise<IHrmTrackerMember.IAuthorized> {
  // 1. Check for duplicate email
  const existingMember = await MyGlobal.prisma.hrm_tracker_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingMember) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member with active status
  const member = await MyGlobal.prisma.hrm_tracker_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      phone: props.body.phone ?? null,
      status: "active" as const,
      email_verified: false,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      phone: true,
      status: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create email verification token with 24-hour expiry
  const verificationToken = v4() as string & tags.Format<"uuid">;
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.hrm_tracker_member_email_verifications.create({
    data: {
      id: verificationToken,
      email: props.body.email,
      member_id: member.id,
      token: verificationToken,
      expires_at: toISOStringSafe(verificationExpires) as string &
        tags.Format<"date-time">,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // 4. Create session record
  const access_token = v4() as string & tags.Format<"uuid">;
  const refresh_token = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.hrm_tracker_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: member.id,
      ip: props.ip,
      access_token,
      refresh_token,
      last_activity_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      expires_at: toISOStringSafe(
        new Date(Date.now() + 60 * 60 * 1000),
      ) as string & tags.Format<"date-time">,
    },
    select: {
      id: true,
      member_id: true,
    },
  });
  // 5. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "member" as const,
        id: member.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member" as const,
        id: member.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        tokenType: "refresh" as const,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  // 6. Build and return response
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_url: member.avatar_url,
    phone: member.phone,
    status: member.status as "active" | "deactivated",
    email_verified: member.email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: token,
  } satisfies IHrmTrackerMember.IAuthorized;
}
