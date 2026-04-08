import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
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

export async function postEcommerceMallAuthGuestJoin(props: {
  ip: string;
  body: IEcommerceMallGuest.IJoin;
}): Promise<IEcommerceMallGuest.IAuthorized> {
  // 1. Validate fingerprint is provided and non-empty
  if (!props.body.fingerprint || props.body.fingerprint.trim() === "") {
    throw new HttpException("Fingerprint is required", 400);
  }
  // 2. Check if guest with fingerprint exists
  const existingGuest = await MyGlobal.prisma.ecommerce_mall_guests.findUnique({
    where: { fingerprint: props.body.fingerprint },
  });
  // 3. Calculate expiration time (24 hours from now)
  const accessExpiresTime = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // 4. If exists, update updated_at timestamp and create session
  if (existingGuest) {
    const updatedGuest = await MyGlobal.prisma.ecommerce_mall_guests.update({
      where: { id: existingGuest.id },
      data: { updated_at: new Date() },
    });
    // 5. Create guest session
    const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.create({
      data: {
        id: v4(),
        ecommerce_mall_guest_id: updatedGuest.id,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        expired_at: accessExpiresTime,
      },
    });
    // 6. Generate JWT tokens
    const token = generateGuestToken(
      updatedGuest.id,
      session.id,
      accessExpiresTime,
    );
    // 7. Return IAuthorized
    return {
      id: updatedGuest.id,
      token,
    } satisfies IEcommerceMallGuest.IAuthorized;
  }
  // 8. If new, create guest record
  const createdGuest = await MyGlobal.prisma.ecommerce_mall_guests.create({
    data: {
      id: v4(),
      fingerprint: props.body.fingerprint,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 9. Create guest session
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.create({
    data: {
      id: v4(),
      ecommerce_mall_guest_id: createdGuest.id,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expired_at: accessExpiresTime,
    },
  });
  // 10. Generate JWT tokens
  const token = generateGuestToken(
    createdGuest.id,
    session.id,
    accessExpiresTime,
  );
  // 11. Return IAuthorized
  return {
    id: createdGuest.id,
    token,
  } satisfies IEcommerceMallGuest.IAuthorized;
}
function generateGuestToken(
  guestId: string,
  sessionId: string,
  expiredAt: string & tags.Format<"date-time">,
): IAuthorizationToken {
  const refreshExpiresTime: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  return {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      } as {
        type: string;
        id: string;
        session_id: string;
        created_at: string;
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      } as {
        type: string;
        id: string;
        session_id: string;
        tokenType: string;
        created_at: string;
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshExpiresTime,
  } satisfies IAuthorizationToken;
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
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthGuestJoin(props: {
//   ip: string;
//   body: IEcommerceMallGuest.IJoin;
// }): Promise<IEcommerceMallGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------