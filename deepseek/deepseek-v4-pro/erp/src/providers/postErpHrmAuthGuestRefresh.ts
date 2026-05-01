import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthGuestRefresh(props: {
  body: IErpHrmGuest.IRefresh;
}): Promise<IErpHrmGuest.IAuthorized> {
  // 1. Verify refresh token JWT
  const verified = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof verified === "string") {
    throw new HttpException("Invalid refresh token", 401);
  }
  if (
    typeof verified !== "object" ||
    verified === null ||
    verified.type !== "member" ||
    typeof verified.id !== "string" ||
    typeof verified.session_id !== "string"
  ) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const decodedId: string = verified.id;
  const decodedSessionId: string = verified.session_id;
  // 2. Validate session exists and is not expired
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst({
    where: {
      id: decodedSessionId,
      erp_hrm_member_id: decodedId,
    },
    select: {
      id: true,
      expired_at: true,
    },
  });
  if (session === null) {
    throw new HttpException(
      "Refresh token is invalid or has already been rotated",
      401,
    );
  }
  const nowIso: string = new Date(Date.now()).toISOString();
  if (session.expired_at.toISOString() < nowIso) {
    throw new HttpException(
      "Session has expired — please authenticate again",
      401,
    );
  }
  // 3. Validate member account not soft-deleted
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: decodedId },
    select: { id: true, deleted_at: true },
  });
  if (member.deleted_at !== null) {
    throw new HttpException(
      "Account has been deleted — cannot refresh session",
      401,
    );
  }
  // 4. Generate new token pair (token rotation — same session_id)
  const nowMs: number = Date.now();
  const signedAt: string = new Date(nowMs).toISOString();
  const accessExpiresAt: string = new Date(
    nowMs + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAt: string = new Date(
    nowMs + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const newAccessToken: string = jwt.sign(
    {
      type: "member",
      id: decodedId,
      session_id: decodedSessionId,
      created_at: signedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken: string = jwt.sign(
    {
      type: "member",
      id: decodedId,
      session_id: decodedSessionId,
      created_at: signedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Persist rotated tokens and extend session expiration
  await MyGlobal.prisma.erp_hrm_member_sessions.update({
    where: { id: decodedSessionId },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpiresAt,
    },
  });
  // 6. Return new token pair
  return {
    id: decodedId,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
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
// import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAuthGuestRefresh(props: {
//   body: IErpHrmGuest.IRefresh;
// }): Promise<IErpHrmGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------