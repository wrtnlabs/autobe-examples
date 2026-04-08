import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSuperAdministratorAtSummaryTransformer } from "../transformers/EcommerceMallSuperAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSuperAdministratorRefresh(props: {
  body: IEcommerceMallSuperAdministrator.IRefresh;
}): Promise<IEcommerceMallSuperAdministrator.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    type: "superAdministrator";
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    decoded = typia.assert<{
      type: "superAdministrator";
      id: string;
      session_id: string;
      created_at: string;
    }>(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "superAdministrator") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_administrator_sessions.findFirst(
      {
        where: { id: decoded.session_id },
      },
    );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate actor exists and is not deleted
  const superAdministrator =
    await MyGlobal.prisma.ecommerce_mall_super_administrators.findUniqueOrThrow(
      {
        where: { id: decoded.id },
      },
    );
  if (superAdministrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Calculate expiration timestamps
  const now = new Date();
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpiresDate);
  const refreshExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpiresDate);
  // 6. Generate new tokens
  const token = {
    access: jwt.sign(
      {
        type: "superAdministrator",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superAdministrator",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 7. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_super_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresDate },
  });
  // 8. Return response
  return {
    id: decoded.id,
    superAdministrator:
      await EcommerceMallSuperAdministratorAtSummaryTransformer.transform({
        id: superAdministrator.id,
        email: superAdministrator.email,
        password_hash: superAdministrator.password_hash,
        display_name: superAdministrator.display_name,
        created_at: superAdministrator.created_at,
        updated_at: superAdministrator.updated_at,
        deleted_at: superAdministrator.deleted_at,
        banned_at: superAdministrator.banned_at,
      }),
    token,
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
// import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthSuperAdministratorRefresh(props: {
//   body: IEcommerceMallSuperAdministrator.IRefresh;
// }): Promise<IEcommerceMallSuperAdministrator.IAuthorized> {
//   return {
//     id: ...,
//     superAdministrator: await EcommerceMallSuperAdministratorAtSummaryTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------