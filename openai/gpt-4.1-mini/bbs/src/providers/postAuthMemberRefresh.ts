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
  try {
    const decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        algorithms: ["HS256"],
      },
    );

    if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
      throw new HttpException("Invalid refresh token payload", 401);
    }

    const memberId = decoded["id"] as string & tags.Format<"uuid">;

    const member = await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { id: memberId, deleted_at: null },
    });

    if (!member) {
      throw new HttpException("Member not found or deactivated", 401);
    }

    const now = toISOStringSafe(new Date());

    // Generate new Access Token
    const accessToken = jwt.sign(
      {
        id: member.id,
        email: member.email,
        display_name: member.display_name,
        type: "member",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
        algorithm: "HS256",
      },
    );

    // Generate new Refresh Token
    const refreshToken = jwt.sign(
      { id: member.id, type: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
        algorithm: "HS256",
      },
    );

    return {
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at:
        member.deleted_at !== null
          ? toISOStringSafe(member.deleted_at)
          : undefined,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
        refreshable_until: toISOStringSafe(
          new Date(Date.now() + 7 * 24 * 3600 * 1000),
        ),
      },
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
}
