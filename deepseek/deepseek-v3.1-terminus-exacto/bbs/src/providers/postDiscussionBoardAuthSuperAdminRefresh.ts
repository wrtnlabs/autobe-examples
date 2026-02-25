import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthSuperAdminRefresh(props: {
  body: IDiscussionBoardSuperAdmin.IRefresh;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "superadmin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_super_admin_id: decoded.id,
        refresh_token: props.body.refresh_token,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate super admin account
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Find section administrator assignment for this super admin
  const sectionAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_super_admin_id: decoded.id,
        deleted_at: null, // Active assignment only
      },
      include: {
        section: true,
        superAdmin: true,
        admin: true,
      },
    });
  if (!sectionAssignment) {
    throw new HttpException("No active section assignment found", 403);
  }
  // 6. Generate new tokens (same session_id)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newAccessToken = jwt.sign(
    {
      type: "superadmin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "superadmin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration and refresh token
  await MyGlobal.prisma.discussion_board_super_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
      refresh_token: newRefreshToken,
    },
  });
  // 8. Construct admin summary (null for super admin assignment)
  const adminSummary = sectionAssignment.admin
    ? {
        id: sectionAssignment.admin.id as string & tags.Format<"uuid">,
        email: sectionAssignment.admin.email as string & tags.Format<"email">,
        display_name: sectionAssignment.admin.display_name,
        created_at: sectionAssignment.admin.created_at.toISOString() as string &
          tags.Format<"date-time">,
      }
    : null;
  // 9. Construct super admin summary
  const superAdminSummary = sectionAssignment.superAdmin
    ? {
        id: sectionAssignment.id as string & tags.Format<"uuid">,
        permission_level: sectionAssignment.permission_level,
        assignment_date:
          sectionAssignment.assignment_date.toISOString() as string &
            tags.Format<"date-time">,
        admin: adminSummary,
        superAdmin: null as IDiscussionBoardSuperAdmin.ISummary | null,
      }
    : null;
  // 10. Construct section summary
  const sectionSummary = {
    id: sectionAssignment.section.id as string & tags.Format<"uuid">,
    name: sectionAssignment.section.name,
    description: sectionAssignment.section.description,
    status: sectionAssignment.section.status,
    display_order: sectionAssignment.section.display_order as number &
      tags.Type<"int32">,
    deleted_at:
      sectionAssignment.section.deleted_at?.toISOString() ??
      (null as (string & tags.Format<"date-time">) | null | undefined),
  };
  // 11. Return authorized response
  return {
    id: sectionAssignment.id as string & tags.Format<"uuid">,
    permission_level: sectionAssignment.permission_level,
    assignment_date: sectionAssignment.assignment_date.toISOString() as string &
      tags.Format<"date-time">,
    admin: adminSummary,
    superAdmin: superAdminSummary,
    section: sectionSummary,
    created_at: sectionAssignment.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: sectionAssignment.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      sectionAssignment.deleted_at?.toISOString() ??
      (null as (string & tags.Format<"date-time">) | null),
    email: superAdmin.email as string & tags.Format<"email">,
    privilege_level: superAdmin.privilege_level,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
