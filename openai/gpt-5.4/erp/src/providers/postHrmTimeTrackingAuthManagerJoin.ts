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

export async function postHrmTimeTrackingAuthManagerJoin(props: {
  ip: string;
  body: IHrmTimeTrackingManager.IJoin;
}): Promise<IHrmTimeTrackingManager.IAuthorized> {
  const existing = await MyGlobal.prisma.hrm_time_tracking_managers.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const now = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const manager = await prisma.hrm_time_tracking_managers.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...HrmTimeTrackingManagerTransformer.select(),
    });
    const session = await prisma.hrm_time_tracking_manager_sessions.create({
      data: {
        id: v4(),
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpiredAt,
        manager: {
          connect: {
            id: manager.id,
          },
        },
      },
      select: {
        id: true,
      },
    });
    return {
      manager,
      session,
    };
  });
  const token = {
    access: jwt.sign(
      {
        type: "manager",
        id: created.manager.id,
        session_id: created.session.id,
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
        type: "manager",
        id: created.manager.id,
        session_id: created.session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  } satisfies IAuthorizationToken;
  return {
    ...(await HrmTimeTrackingManagerTransformer.transform(created.manager)),
    token,
  } satisfies IHrmTimeTrackingManager.IAuthorized;
}
