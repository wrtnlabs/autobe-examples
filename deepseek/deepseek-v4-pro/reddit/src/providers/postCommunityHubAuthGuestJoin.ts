import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
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

export async function postCommunityHubAuthGuestJoin(props: {
  ip: string;
  body: ICommunityHubGuest.IJoin;
}): Promise<ICommunityHubGuest.IAuthorized> {
  const existingGuest = await MyGlobal.prisma.community_hub_guests.findUnique({
    where: { fingerprint: props.body.fingerprint },
  });
  const nowISO: string = new Date().toISOString();
  const accessExpiresISO: string = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpiresISO: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  let guestId: string;
  let guestFingerprint: string;
  let guestCreatedAt: string;
  let guestUpdatedAt: string;
  if (existingGuest !== null) {
    const updated = await MyGlobal.prisma.community_hub_guests.update({
      where: { id: existingGuest.id },
      data: { updated_at: nowISO },
    });
    guestId = updated.id;
    guestFingerprint = updated.fingerprint;
    guestCreatedAt = updated.created_at.toISOString();
    guestUpdatedAt = updated.updated_at.toISOString();
  } else {
    const newId = v4();
    const created = await MyGlobal.prisma.community_hub_guests.create({
      data: {
        id: newId,
        fingerprint: props.body.fingerprint,
        created_at: nowISO,
        updated_at: nowISO,
      },
    });
    guestId = created.id;
    guestFingerprint = created.fingerprint;
    guestCreatedAt = created.created_at.toISOString();
    guestUpdatedAt = created.updated_at.toISOString();
  }
  const sessionId = v4();
  await MyGlobal.prisma.community_hub_guest_sessions.create({
    data: {
      id: sessionId,
      guest: { connect: { id: guestId } },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: nowISO,
      expired_at: refreshExpiresISO,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresISO,
    refreshable_until: refreshExpiresISO,
  };
  return {
    id: guestId,
    fingerprint: guestFingerprint,
    created_at: guestCreatedAt,
    updated_at: guestUpdatedAt,
    token,
  } satisfies ICommunityHubGuest.IAuthorized;
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
// import { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubAuthGuestJoin(props: {
//   ip: string;
//   body: ICommunityHubGuest.IJoin;
// }): Promise<ICommunityHubGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------