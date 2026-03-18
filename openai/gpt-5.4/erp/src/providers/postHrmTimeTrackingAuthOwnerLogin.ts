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
import { HrmTimeTrackingOwnerTransformer } from "../transformers/HrmTimeTrackingOwnerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthOwnerLogin(props: {
  ip: string;
  body: IHrmTimeTrackingOwner.ILogin;
}): Promise<IHrmTimeTrackingOwner.IAuthorized> {
  const owner = await MyGlobal.prisma.hrm_time_tracking_owners.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      ...HrmTimeTrackingOwnerTransformer.select().select,
      password_hash: true,
      sessions: {
        select: {
          organization: {
            select: {
              id: true,
            },
          },
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 1,
      } satisfies Prisma.hrm_time_tracking_owner_sessionsFindManyArgs,
    },
  });
  if (
    owner === null ||
    owner.deleted_at !== null ||
    owner.deactivated_at !== null ||
    owner.sessions[0] === undefined
  ) {
    throw new HttpException("Invalid credentials", 401);
  }
  const verified = await PasswordUtil.verify(
    props.body.password,
    owner.password_hash,
  );
  if (verified === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = toISOStringSafe(new Date()) satisfies string as string &
    tags.Format<"date-time">;
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) satisfies string as string & tags.Format<"date-time">;
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) satisfies string as string & tags.Format<"date-time">;
  const sessionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.hrm_time_tracking_owners.update({
    where: {
      id: owner.id,
    },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_owner_sessions.create({
    data: {
      id: sessionId,
      owner: {
        connect: {
          id: owner.id,
        },
      },
      organization: {
        connect: {
          id: owner.sessions[0].organization.id,
        },
      },
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpiredAt,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: sessionId,
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
        type: "owner",
        id: owner.id,
        session_id: sessionId,
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
  };
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_owners.findUniqueOrThrow({
      where: {
        id: owner.id,
      },
      ...HrmTimeTrackingOwnerTransformer.select(),
    });
  return {
    ...(await HrmTimeTrackingOwnerTransformer.transform(updated)),
    token,
  };
}
