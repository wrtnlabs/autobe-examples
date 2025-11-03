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

export async function postAuthMemberRefresh(props: {
  body: IDiscussionBoardMember.IRefresh;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { body } = props;

  const buildResponse = (
    memberRecord: any,
    accessToken: string,
    refreshToken: string,
    accessExpiresAt: string & tags.Format<"date-time">,
    refreshExpiresAt: string & tags.Format<"date-time">,
  ): IDiscussionBoardMember.IAuthorized => {
    return {
      id: memberRecord.id as string & tags.Format<"uuid">,
      username: memberRecord.username,
      email: memberRecord.email as string & tags.Format<"email">,
      display_name: memberRecord.display_name ?? null,
      role: memberRecord.role ?? undefined,
      mfa_enabled: memberRecord.mfa_enabled ?? undefined,
      created_at: toISOStringSafe(memberRecord.created_at),
      updated_at: memberRecord.updated_at
        ? toISOStringSafe(memberRecord.updated_at)
        : undefined,
      deleted_at: memberRecord.deleted_at
        ? toISOStringSafe(memberRecord.deleted_at)
        : null,
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: accessExpiresAt,
        refreshable_until: refreshExpiresAt,
      },
      member: {
        id: memberRecord.id as string & tags.Format<"uuid">,
        username: memberRecord.username,
        display_name: memberRecord.display_name ?? null,
        created_at: toISOStringSafe(memberRecord.created_at),
      },
    };
  };

  // common: compute expirations
  const accessExpiryDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires = toISOStringSafe(accessExpiryDate);
  const refreshExpires = toISOStringSafe(refreshExpiryDate);

  // Helper for unauthorized
  const unauthorized = (
    message = "Invalid or expired refresh token",
  ): never => {
    throw new HttpException(message, 401);
  };

  try {
    if (body.type === "refresh_token") {
      let decoded: any;
      try {
        decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
          issuer: "autobe",
        });
      } catch (err) {
        unauthorized();
      }

      if (
        !decoded ||
        decoded.type !== "member" ||
        !decoded.id ||
        !decoded.session_id
      ) {
        throw new HttpException(
          "Forbidden: Invalid token type or payload",
          403,
        );
      }

      const member =
        await MyGlobal.prisma.discussion_board_member.findUniqueOrThrow({
          where: { id: decoded.id },
        });
      if (member.deleted_at !== null)
        throw new HttpException("Account has been deleted", 403);

      const session =
        await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
          where: {
            id: decoded.session_id,
            discussion_board_member_id: decoded.id,
          },
        });
      if (!session) unauthorized();

      // Create a non-null typed alias so the compiler understands it's non-null
      const sessionRecord = session as NonNullable<typeof session>;

      if (
        sessionRecord.expired_at &&
        sessionRecord.expired_at.getTime() <= Date.now()
      ) {
        unauthorized("Session expired or revoked");
      }

      const newAccess = jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      );

      const newRefresh = jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      );

      await MyGlobal.prisma.discussion_board_member_sessions.update({
        where: { id: decoded.session_id },
        data: { expired_at: refreshExpiryDate },
      });

      return buildResponse(
        member,
        newAccess,
        newRefresh,
        accessExpires,
        refreshExpires,
      );
    }

    if (body.type === "session_id") {
      const sessionId = body.session_id;
      const session =
        await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
          where: { id: sessionId },
        });
      if (!session) unauthorized();

      // Create a non-null typed alias so the compiler understands it's non-null
      const sessionRecord = session as NonNullable<typeof session>;

      const member =
        await MyGlobal.prisma.discussion_board_member.findUniqueOrThrow({
          where: { id: sessionRecord.discussion_board_member_id },
        });
      if (member.deleted_at !== null)
        throw new HttpException("Account has been deleted", 403);

      if (
        sessionRecord.expired_at &&
        sessionRecord.expired_at.getTime() <= Date.now()
      ) {
        unauthorized("Session expired or revoked");
      }

      const newAccess = jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionRecord.id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      );

      const newRefresh = jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: sessionRecord.id,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      );

      await MyGlobal.prisma.discussion_board_member_sessions.update({
        where: { id: sessionRecord.id },
        data: { expired_at: refreshExpiryDate },
      });

      return buildResponse(
        member,
        newAccess,
        newRefresh,
        accessExpires,
        refreshExpires,
      );
    }

    throw new HttpException("Bad Request: unknown refresh type", 400);
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
