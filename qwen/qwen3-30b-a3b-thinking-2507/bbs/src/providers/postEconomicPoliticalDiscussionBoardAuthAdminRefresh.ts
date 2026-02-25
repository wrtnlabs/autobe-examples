import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
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

export async function postEconomicPoliticalDiscussionBoardAuthAdminRefresh(props: {
  body: IEconomicPoliticalDiscussionBoardAdmin.IRefresh;
}): Promise<IEconomicPoliticalDiscussionBoardAdmin.IAuthorized> {
  try {
    const decoded = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "admin";
    };
    if (decoded.type !== "admin") {
      throw new HttpException("Invalid token type", 403);
    }
    const session =
      await MyGlobal.prisma.economic_political_discussion_board_admin_sessions.findFirst(
        {
          where: { id: decoded.session_id, admin_id: decoded.id },
        },
      );
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    const admin =
      await MyGlobal.prisma.economic_political_discussion_board_admins.findUniqueOrThrow(
        {
          where: { id: decoded.id },
        },
      );
    if (admin.deleted_at !== null) {
      throw new HttpException("Account has been deleted", 403);
    }
    const ACCESS_EXPIRES_SECONDS = 15 * 60;
    const REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60;
    const accessExpiresDate = new Date(
      Date.now() + ACCESS_EXPIRES_SECONDS * 1000,
    );
    const refreshExpiresDate = new Date(
      Date.now() + REFRESH_EXPIRES_SECONDS * 1000,
    );
    const accessToken = jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: `${ACCESS_EXPIRES_SECONDS} seconds`, issuer: "autobe" },
    );
    const refreshToken = jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: `${REFRESH_EXPIRES_SECONDS} seconds`, issuer: "autobe" },
    );
    await MyGlobal.prisma.economic_political_discussion_board_admin_sessions.update(
      {
        where: { id: decoded.session_id },
        data: { expired_at: toISOStringSafe(refreshExpiresDate) },
      },
    );
    return {
      id: admin.id,
      email: admin.email,
      role: typia.assert<"user" | "admin" | "super-admin">(admin.role),
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
      access: accessToken,
      refresh: refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        role: typia.assert<"user" | "admin" | "super-admin">(admin.role),
        created_at: toISOStringSafe(admin.created_at),
        updated_at: toISOStringSafe(admin.updated_at),
        deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
      },
      token: {
        access: accessToken,
        refresh: refreshToken,
        expired_at: toISOStringSafe(accessExpiresDate),
        refreshable_until: toISOStringSafe(refreshExpiresDate),
      },
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpException("Refresh token expired", 401);
    } else {
      throw new HttpException("Invalid refresh token", 401);
    }
  }
}
