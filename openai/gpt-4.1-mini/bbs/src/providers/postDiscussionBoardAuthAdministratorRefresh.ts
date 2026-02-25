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

export async function postDiscussionBoardAuthAdministratorRefresh(props: {
  body: IDiscussionBoardAdministrator.IRefresh;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  let decodedRaw: string | jwt.JwtPayload;
  try {
    decodedRaw = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (
    typeof decodedRaw !== "object" ||
    decodedRaw === null ||
    decodedRaw.type !== "administrator" ||
    typeof decodedRaw.id !== "string" ||
    typeof decodedRaw.session_id !== "string"
  ) {
    throw new HttpException("Invalid token type", 403);
  }
  const decoded = {
    id: decodedRaw.id,
    session_id: decodedRaw.session_id,
    type: decodedRaw.type as "administrator",
  };
  const session =
    await MyGlobal.prisma.discussion_board_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        administrator_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (administrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowTimestamp = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) satisfies string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) satisfies string & tags.Format<"date-time">;
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: nowTimestamp,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: nowTimestamp,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  await MyGlobal.prisma.discussion_board_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: administrator.id,
    email: administrator.email,
    createdAt: toISOStringSafe(administrator.created_at) satisfies string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(administrator.updated_at) satisfies string &
      tags.Format<"date-time">,
    deletedAt: administrator.deleted_at
      ? (toISOStringSafe(administrator.deleted_at) satisfies string &
          tags.Format<"date-time">)
      : null,
    gradeId: administrator.grade_id,
    grade: undefined,
    token,
  };
}
