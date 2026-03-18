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

export async function postHrmTimeTrackingAuthOwnerJoin(props: {
  ip: string;
  body: IHrmTimeTrackingOwner.IJoin;
}): Promise<IHrmTimeTrackingOwner.IAuthorized> {
  const normalizedEmail: string = props.body.email.trim().toLowerCase();
  const normalizedPassword: string = props.body.password.trim();
  const requestIp: string = props.body.ip ?? props.ip;
  const nowText: string = toISOStringSafe("now");
  const accessExpiredAtText: string = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntilText: string = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const ownerId: string = v4();
  const sessionId: string = v4();
  if (normalizedEmail.length === 0) {
    throw new HttpException("Invalid email", 400);
  }
  if (normalizedPassword.length === 0) {
    throw new HttpException("Invalid password", 400);
  }
  if (requestIp.length === 0) {
    throw new HttpException("Invalid ip", 400);
  }
  const existing = await MyGlobal.prisma.hrm_time_tracking_owners.findFirst({
    where: {
      email: normalizedEmail,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const owner = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.hrm_time_tracking_owners.create({
      data: {
        id: ownerId,
        email: normalizedEmail,
        password_hash: await PasswordUtil.hash(normalizedPassword),
        last_login_at: nowText,
        deactivated_at: null,
        created_at: nowText,
        updated_at: nowText,
        deleted_at: null,
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
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: sessionId,
        created_at: nowText,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowText,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAtText,
    refreshable_until: refreshableUntilText,
  };
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
