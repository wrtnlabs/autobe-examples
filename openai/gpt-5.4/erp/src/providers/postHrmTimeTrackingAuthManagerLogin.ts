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
import { HrmTimeTrackingManagerTransformer } from "../transformers/HrmTimeTrackingManagerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthManagerLogin(props: {
  ip: string;
  body: IHrmTimeTrackingManager.ILogin;
}): Promise<IHrmTimeTrackingManager.IAuthorized> {
  const manager = await MyGlobal.prisma.hrm_time_tracking_managers.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      ...HrmTimeTrackingManagerTransformer.select().select,
      password_hash: true,
    },
  });
  if (manager === null) throw new HttpException("Invalid credentials", 401);
  if (manager.deleted_at !== null)
    throw new HttpException("Invalid credentials", 401);
  const verified = await PasswordUtil.verify(
    props.body.password,
    manager.password_hash,
  );
  if (verified === false) throw new HttpException("Invalid credentials", 401);
  const nowMs = Date.now();
  const createdAt = new globalThis.Date(nowMs).toISOString();
  const expiredAt = new globalThis.Date(nowMs + 60 * 60 * 1000).toISOString();
  const refreshableUntil = new globalThis.Date(
    nowMs + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionId = v4();
  await MyGlobal.prisma.hrm_time_tracking_manager_sessions.create({
    data: {
      id: sessionId,
      manager: {
        connect: {
          id: manager.id,
        },
      },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAt,
      expired_at: expiredAt,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "manager",
        id: manager.id,
        session_id: sessionId,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "manager",
        id: manager.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  } satisfies IAuthorizationToken;
  return {
    ...(await HrmTimeTrackingManagerTransformer.transform(manager)),
    token,
  } satisfies IHrmTimeTrackingManager.IAuthorized;
}
