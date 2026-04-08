import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeAuthGuestRefresh(props: {
  body: IErpHrmTimeGuestSession.IRefresh;
}): Promise<IErpHrmTimeGuestSession.IAuthorized> {
  type GuestRefreshPayload = {
    id: string;
    session_id: string;
    type: "guest";
    tokenType?: "refresh";
  };
  const decoded: GuestRefreshPayload = (() => {
    try {
      const verified: unknown = jwt.verify(
        props.body.refreshToken,
        MyGlobal.env.JWT_SECRET_KEY,
        {
          issuer: "autobe",
        },
      );
      if (typeof verified !== "object" || verified === null) {
        throw new HttpException("Invalid or expired refresh token", 401);
      }
      const candidate = verified as {
        id?: unknown;
        session_id?: unknown;
        type?: unknown;
        tokenType?: unknown;
      };
      if (
        candidate.type !== "guest" ||
        typeof candidate.id !== "string" ||
        typeof candidate.session_id !== "string"
      ) {
        throw new HttpException("Invalid or expired refresh token", 401);
      }
      if (
        candidate.tokenType !== undefined &&
        candidate.tokenType !== "refresh"
      ) {
        throw new HttpException("Invalid or expired refresh token", 401);
      }
      return {
        id: candidate.id,
        session_id: candidate.session_id,
        type: "guest",
        tokenType: "refresh",
      };
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const createdAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const accessToken: string = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: decoded.type,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const refreshToken: string = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: decoded.type,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );
  return {
    access: accessToken,
    refresh: refreshToken,
    expiredAt: accessExpiresAt,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshableUntil,
    },
  } satisfies IErpHrmTimeGuestSession.IAuthorized;
}
