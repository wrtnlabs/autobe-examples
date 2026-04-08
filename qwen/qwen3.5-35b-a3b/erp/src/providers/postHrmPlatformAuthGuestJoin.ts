import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthGuestJoin(props: {
  ip: string;
  body: IHrmPlatformGuest.IJoin;
}): Promise<IHrmPlatformGuest.IAuthorized> {
  const { body, ip } = props;
  if (body.email === undefined) {
    throw new HttpException("Email is required", 400);
  }
  if (body.password === undefined) {
    throw new HttpException("Password is required", 400);
  }
  if (body.name === undefined || body.name.length === 0) {
    throw new HttpException("Name is required", 400);
  }
  if (body.href === undefined) {
    throw new HttpException("Href is required", 400);
  }
  const deviceIdentifier: string & tags.Format<"uuid"> = v4();
  const sessionIp: string & tags.Format<"ipv4"> = body.ip ?? ip;
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const existingGuest = await MyGlobal.prisma.hrm_platform_guests.findUnique({
    where: { device_identifier: deviceIdentifier },
  });
  if (existingGuest !== null) {
    const activeSession =
      await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
        where: {
          hrm_platform_guest_id: existingGuest.id,
          expired_at: { gte: new Date() },
        },
        orderBy: { created_at: "desc" },
      });
    if (activeSession !== null) {
      throw new HttpException("Device already has active session", 409);
    }
  } else {
    await MyGlobal.prisma.hrm_platform_guests.create({
      data: {
        id: v4(),
        device_identifier: deviceIdentifier,
        ip_address: sessionIp,
        user_agent: "",
        created_at: new Date(now),
        updated_at: new Date(now),
        deleted_at: null,
      },
    });
  }
  const guest = await MyGlobal.prisma.hrm_platform_guests.findUniqueOrThrow({
    where: { device_identifier: deviceIdentifier },
    select: {
      id: true,
      device_identifier: true,
      ip_address: true,
      user_agent: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.create({
    data: {
      id: v4(),
      hrm_platform_guest_id: guest.id,
      session_token: v4(),
      ip: sessionIp,
      href: body.href,
      referrer: body.referrer ?? null,
      created_at: new Date(now),
      expired_at: new Date(accessExpires),
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: guest.id,
    device_identifier: guest.device_identifier,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
    deleted_at: guest.deleted_at?.toISOString() ?? null,
    token,
    session_id: session.id,
    organization_id: null,
  } satisfies IHrmPlatformGuest.IAuthorized;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformAuthGuestJoin(props: {
//   ip: string;
//   body: IHrmPlatformGuest.IJoin;
// }): Promise<IHrmPlatformGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------