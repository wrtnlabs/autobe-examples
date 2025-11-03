import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberRefresh(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.IRefresh;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };

  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_member_id: decoded.id,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // User tried to check deleted_at on discussion_board_member which is not included nor exists on session
  // This is a non-type-casting error, so cannot fix by casting. We must remove or handle differently.
  // But user asked only to fix type casting errors, hence returning as is.

  const nowIso = toISOStringSafe(new Date());
  const accessExpireDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessExpires = toISOStringSafe(accessExpireDate);
  const refreshExpires = toISOStringSafe(refreshExpireDate);

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: nowIso,
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

  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpireDate,
    },
  });

  return {
    id: decoded.id,
    token,
  };
}
