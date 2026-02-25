import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function postDiscussionBoardAuthAdministratorJoin(props: {
  ip: string;
  body: IDiscussionBoardAdministrator.IJoin;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  // Check duplicate email
  const existing =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Generate admin id
  const adminId = v4() as string & tags.Format<"uuid">;
  // Get current ISO string date-time safely
  const nowISO = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  // Create administrator
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.create({
      data: {
        id: adminId,
        email: props.body.email,
        password_hash: passwordHash,
        created_at: nowISO,
        updated_at: nowISO,
        deleted_at: null,
        grade_id: "00000000-0000-0000-0000-000000000000",
      },
    });
  // Calculate session expiry
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires = toISOStringSafe(accessExpiresDate) as string &
    tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(refreshExpiresDate) as string &
    tags.Format<"date-time">;
  // Create session
  const session =
    await MyGlobal.prisma.discussion_board_administrator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        administrator_id: administrator.id,
        expired_at: accessExpires,
        created_at: nowISO,
        ip: props.ip,
        href: "",
        referrer: "",
      },
    });
  // Generate JWT tokens
  const tokenPayloadAccess = {
    type: "administrator",
    id: administrator.id,
    session_id: session.id,
    created_at: nowISO,
  };
  const tokenPayloadRefresh = {
    type: "administrator",
    id: administrator.id,
    session_id: session.id,
    tokenType: "refresh",
    created_at: nowISO,
  };
  const token = {
    access: jwt.sign(tokenPayloadAccess, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(tokenPayloadRefresh, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
      issuer: "autobe",
    }),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Return authorized administrator
  return {
    id: administrator.id,
    email: administrator.email,
    createdAt: toISOStringSafe(administrator.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(administrator.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: administrator.deleted_at
      ? (toISOStringSafe(administrator.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
    grade: undefined,
    gradeId: administrator.grade_id as string & tags.Format<"uuid">,
    token,
  };
}
