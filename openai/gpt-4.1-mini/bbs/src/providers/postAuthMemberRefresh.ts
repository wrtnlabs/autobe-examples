import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommon";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberRefresh(props: {
  member: MemberPayload;
  body: ICommon.IRefreshTokenRequest;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };

  try {
    const decodedRaw = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );

    if (typeof decodedRaw !== "object" || decodedRaw === null) {
      throw new HttpException("Invalid token payload", 401);
    }

    if (
      !("id" in decodedRaw && typeof decodedRaw.id === "string") ||
      !(
        "session_id" in decodedRaw && typeof decodedRaw.session_id === "string"
      ) ||
      !("type" in decodedRaw && decodedRaw.type === "member")
    ) {
      throw new HttpException("Invalid token payload", 401);
    }

    decoded = {
      id: decodedRaw.id as string & tags.Format<"uuid">,
      session_id: decodedRaw.session_id as string & tags.Format<"uuid">,
      type: "member",
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_member_id: decoded.id,
        expired_at: null,
        discussionBoardMember: {
          deleted_at: null,
        },
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const now = Date.now();
  const accessExpires = toISOStringSafe(new Date(now + 1000 * 60 * 60));
  const refreshExpires = toISOStringSafe(
    new Date(now + 1000 * 60 * 60 * 24 * 7),
  );

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  return {
    id: decoded.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
