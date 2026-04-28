import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityAuthGuestJoin(props: {
  ip: string;
  body: IRedditLikeCommunityGuest.IJoin;
}): Promise<IRedditLikeCommunityGuest.IAuthorized> {
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nowIso: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;
  const accessExpiresIso: string & tags.Format<"date-time"> =
    accessExpires.toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresIso: string & tags.Format<"date-time"> =
    refreshExpires.toISOString() as string & tags.Format<"date-time">;
  let guest = await (async () => {
    if (props.body.device_fingerprint) {
      const existing =
        await MyGlobal.prisma.reddit_like_community_guests.findFirst({
          where: {
            device_fingerprint: props.body.device_fingerprint,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (existing) return existing;
    }
    return await MyGlobal.prisma.reddit_like_community_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.device_fingerprint ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: { id: true },
    });
  })();
  const session =
    await MyGlobal.prisma.reddit_like_community_guest_sessions.create({
      data: {
        id: v4(),
        guest: { connect: { id: guest.id } },
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: sessionExpires,
      },
      select: { id: true },
    });
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: nowIso,
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
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  } satisfies IAuthorizationToken;
  return {
    id: Object.assign({} as string & tags.Format<"uuid">, guest.id),
    token,
  } satisfies IRedditLikeCommunityGuest.IAuthorized;
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
// import { IRedditLikeCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityAuthGuestJoin(props: {
//   ip: string;
//   body: IRedditLikeCommunityGuest.IJoin;
// }): Promise<IRedditLikeCommunityGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------