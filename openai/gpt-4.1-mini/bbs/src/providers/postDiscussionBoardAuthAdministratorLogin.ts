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

export async function postDiscussionBoardAuthAdministratorLogin(props: {
  body: IDiscussionBoardAdministrator.ILogin;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  const adminRaw =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        grade_id: true,
        password_hash: true,
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });
  if (!adminRaw) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    adminRaw.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const nowIso = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  const session =
    await MyGlobal.prisma.discussion_board_administrator_sessions.create({
      data: {
        id: sessionId,
        administrator_id: adminRaw.id,
        ip: "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowIso,
        expired_at: accessExpires,
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: adminRaw.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: adminRaw.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: adminRaw.id,
    email: adminRaw.email,
    createdAt: toISOStringSafe(adminRaw.created_at),
    updatedAt: toISOStringSafe(adminRaw.updated_at),
    deletedAt: adminRaw.deleted_at
      ? toISOStringSafe(adminRaw.deleted_at)
      : null,
    grade: adminRaw.grade
      ? {
          id: adminRaw.grade.id,
          name: adminRaw.grade.name,
          level: adminRaw.grade.level,
        }
      : undefined,
    gradeId: adminRaw.grade_id,
    token,
  };
}
