import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberJoin(props: {
  ip: string;
  body: IErpHrmMember.IJoin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password and create member
  const memberId = v4() as string & tags.Format<"uuid">;
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const member = await MyGlobal.prisma.erp_hrm_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.displayName,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create session with JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expired_at: accessExpires,
      created_at: new Date(),
      expired_at: refreshExpires,
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      token_expired_at: true,
      expired_at: true,
    },
  });
  // 4. Build IAuthorized response (new member has no organization context, empty stats)
  return {
    activeTimers: [],
    projectSummary: {
      active: 0 as number & tags.Type<"int32">,
      archived: 0 as number & tags.Type<"int32">,
      completed: 0 as number & tags.Type<"int32">,
    },
    taskOverview: {
      byPriority: {
        high: 0 as number & tags.Type<"int32">,
        low: 0 as number & tags.Type<"int32">,
        medium: 0 as number & tags.Type<"int32">,
        urgent: 0 as number & tags.Type<"int32">,
      },
      byStatus: {
        closed: 0 as number & tags.Type<"int32">,
        completed: 0 as number & tags.Type<"int32">,
        inProgress: 0 as number & tags.Type<"int32">,
        open: 0 as number & tags.Type<"int32">,
      },
    },
    recentActivity: {
      timelogsCount: 0 as number & tags.Type<"int32">,
      totalHoursThisWeek: 0,
    },
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_uri: member.avatar_uri,
    phone: member.phone,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: member.deleted_at
      ? (member.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
    token: {
      access: session.access_token,
      refresh: session.refresh_token,
      expired_at: session.token_expired_at.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: session.expired_at.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
