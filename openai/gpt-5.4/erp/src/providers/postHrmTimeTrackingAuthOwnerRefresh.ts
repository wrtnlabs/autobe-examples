import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthOwnerRefresh(props: {
  body: IHrmTimeTrackingOwner.IRefresh;
}): Promise<IHrmTimeTrackingOwner.IAuthorized> {
  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const unauthorized = (): never => {
    throw new HttpException("Invalid or expired refresh token", 401);
  };
  const forbidden = (message: string): never => {
    throw new HttpException(message, 403);
  };
  const verifiedPayload: jwt.JwtPayload = (() => {
    try {
      const verifiedToken = jwt.verify(
        props.body.refresh,
        MyGlobal.env.JWT_SECRET_KEY,
        {
          issuer: "autobe",
        },
      );
      if (typeof verifiedToken === "string" || verifiedToken === null)
        return unauthorized();
      return verifiedToken;
    } catch {
      return unauthorized();
    }
  })();
  const type = verifiedPayload.type;
  const id = verifiedPayload.id;
  const sessionId = verifiedPayload.session_id;
  const tokenType = verifiedPayload.tokenType;
  if (type !== "owner") unauthorized();
  if (typeof id !== "string") unauthorized();
  if (typeof sessionId !== "string") unauthorized();
  if (tokenType !== undefined && tokenType !== "refresh") unauthorized();
  const verified = {
    type,
    id,
    session_id: sessionId,
    tokenType,
  };
  const session = await (async () => {
    const sessionResult =
      await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirst({
        where: {
          id: verified.session_id,
          hrm_time_tracking_owner_id: verified.id,
          expired_at: {
            gt: now,
          },
        },
        select: {
          id: true,
          hrm_time_tracking_owner_id: true,
        },
      });
    if (sessionResult === null) return unauthorized();
    return sessionResult;
  })();
  const owner =
    await MyGlobal.prisma.hrm_time_tracking_owners.findUniqueOrThrow({
      where: {
        id: verified.id,
      },
      select: {
        id: true,
        email: true,
        last_login_at: true,
        deactivated_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (owner.deleted_at !== null) forbidden("Account has been deleted");
  if (owner.deactivated_at !== null) forbidden("Account has been deactivated");
  const createdAt = toISOStringSafe(now);
  const token = {
    access: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "1h",
      },
    ),
    refresh: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: session.id,
        created_at: createdAt,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "7d",
      },
    ),
    expired_at: toISOStringSafe(accessExpiredAt),
    refreshable_until: toISOStringSafe(refreshableUntil),
  } satisfies IAuthorizationToken;
  await MyGlobal.prisma.hrm_time_tracking_owner_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      expired_at: refreshableUntil,
    },
  });
  return {
    id: owner.id,
    email: owner.email,
    last_login_at:
      owner.last_login_at !== null
        ? toISOStringSafe(owner.last_login_at)
        : null,
    deactivated_at:
      owner.deactivated_at !== null
        ? toISOStringSafe(owner.deactivated_at)
        : null,
    created_at: toISOStringSafe(owner.created_at),
    updated_at: toISOStringSafe(owner.updated_at),
    deleted_at:
      owner.deleted_at !== null ? toISOStringSafe(owner.deleted_at) : null,
    token,
  };
}
