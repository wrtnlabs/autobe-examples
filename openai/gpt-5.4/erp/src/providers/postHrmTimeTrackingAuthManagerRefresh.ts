import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthManagerRefresh(props: {
  body: IHrmTimeTrackingManager.IRefresh;
}): Promise<IHrmTimeTrackingManager.IAuthorized> {
  const throwUnauthorized = (): never => {
    throw new HttpException("Invalid or expired refresh token", 401);
  };
  const throwForbidden = (): never => {
    throw new HttpException("Invalid token type", 403);
  };
  const throwIneligible = (): never => {
    throw new HttpException("Account is not eligible for authentication", 403);
  };
  const verified: {
    id: string;
    session_id: string;
    type: string;
  } = (() => {
    try {
      return typia.assert<{
        id: string;
        session_id: string;
        type: string;
      }>(
        jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
          issuer: "autobe",
        }),
      );
    } catch {
      return throwUnauthorized();
    }
  })();
  if (verified.type !== "manager") {
    throwForbidden();
  }
  const session =
    await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findFirst({
      where: {
        id: verified.session_id,
        hrm_time_tracking_manager_id: verified.id,
      },
      select: {
        id: true,
        expired_at: true,
      },
    });
  const activeSession = session ?? throwUnauthorized();
  if (activeSession.expired_at.getTime() <= Date.now()) {
    throwUnauthorized();
  }
  const manager =
    await MyGlobal.prisma.hrm_time_tracking_managers.findUniqueOrThrow({
      where: {
        id: verified.id,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (manager.deleted_at !== null) {
    throwIneligible();
  }
  const now = Date.now();
  const createdAt = toISOStringSafe(new Date(now).toISOString());
  const expiredAtDate = new Date(now + 60 * 60 * 1000);
  const refreshableUntilDate = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const expiredAt = toISOStringSafe(expiredAtDate.toISOString());
  const refreshableUntil = toISOStringSafe(refreshableUntilDate.toISOString());
  const access = jwt.sign(
    {
      type: "manager",
      id: manager.id,
      session_id: activeSession.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const refresh = jwt.sign(
    {
      type: "manager",
      id: manager.id,
      session_id: activeSession.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );
  await MyGlobal.prisma.hrm_time_tracking_manager_sessions.update({
    where: {
      id: activeSession.id,
    },
    data: {
      expired_at: refreshableUntilDate,
    },
  });
  return {
    id: manager.id,
    email: manager.email,
    created_at: toISOStringSafe(manager.created_at.toISOString()),
    updated_at: toISOStringSafe(manager.updated_at.toISOString()),
    deleted_at: manager.deleted_at?.toISOString() ?? null,
    token: {
      access,
      refresh,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
