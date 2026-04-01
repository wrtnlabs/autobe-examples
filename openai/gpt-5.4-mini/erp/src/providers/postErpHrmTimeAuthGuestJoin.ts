import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeAuthGuestJoin(props: {
  ip: string;
  body: IErpHrmTimeGuest.IJoin;
}): Promise<IErpHrmTimeGuest.IAuthorized> {
  const guest = await MyGlobal.prisma.erp_hrm_time_guests.create({
    data: {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.erp_hrm_time_guest_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_time_guest_id: guest.id,
      session_token: v4(),
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const createdAt = new Date().toISOString();
  return {
    id: guest.id,
    token: {
      access: jwt.sign(
        {
          type: "guest",
          id: guest.id,
          session_id: sessionId,
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "guest",
          id: guest.id,
          session_id: sessionId,
          created_at: createdAt,
          tokenType: "refresh",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
