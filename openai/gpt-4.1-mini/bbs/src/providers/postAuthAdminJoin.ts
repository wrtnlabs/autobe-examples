import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const existingAdmin = await MyGlobal.prisma.discussion_board_admin.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const toIsoStringDate = (): string & tags.Format<"date-time"> => {
    return toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  };

  const generateFutureIsoString = (
    ms: number,
  ): string & tags.Format<"date-time"> => {
    return toISOStringSafe(new Date(Date.now() + ms)) as string &
      tags.Format<"date-time">;
  };

  const now: string & tags.Format<"date-time"> = toIsoStringDate();
  const id: string & tags.Format<"uuid"> = v4();

  const admin = await MyGlobal.prisma.discussion_board_admin.create({
    data: {
      id,
      email: props.body.email,
      password_hash: hashedPassword,
      nickname: props.body.nickname,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const sessionId: string & tags.Format<"uuid"> = v4();
  const ip: string = "";
  const href: string = "";
  const referrer: string = "";

  const accessExpireMs: number = 60 * 60 * 1000;
  const refreshExpireMs: number = 7 * 24 * 60 * 60 * 1000;

  const accessExpireDate: string & tags.Format<"date-time"> =
    generateFutureIsoString(accessExpireMs);
  const refreshExpireDate: string & tags.Format<"date-time"> =
    generateFutureIsoString(refreshExpireMs);

  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussion_board_admin_id: admin.id,
      ip,
      href,
      referrer,
      created_at: now,
      expired_at: accessExpireDate,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
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
        type: "admin",
        id: admin.id,
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
    expired_at: accessExpireDate,
    refreshable_until: refreshExpireDate,
  };

  return {
    id: admin.id,
    email: admin.email,
    nickname: admin.nickname,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: null,
    token,
  };
}
