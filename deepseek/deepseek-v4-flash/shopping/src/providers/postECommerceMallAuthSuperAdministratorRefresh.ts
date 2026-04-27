import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallSuperAdministratorTransformer } from "../transformers/ECommerceMallSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAuthSuperAdministratorRefresh(props: {
  body: IECommerceMallSuperAdministrator.IRefresh;
}): Promise<IECommerceMallSuperAdministrator.IAuthorized> {
  // ---------------------------------------------------------
  // 1. Decode and verify the refresh token
  // ---------------------------------------------------------
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    const payload = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof payload === "object" &&
      payload !== null &&
      "id" in payload &&
      "session_id" in payload &&
      "type" in payload
    ) {
      const p = payload as {
        id: string;
        session_id: string;
        type: string;
      };
      decoded = {
        id: p.id,
        session_id: p.session_id,
        type: p.type,
      };
    } else {
      throw new Error("Invalid token payload structure");
    }
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // ---------------------------------------------------------
  // 2. Validate token type matches superAdministrator
  // ---------------------------------------------------------
  if (decoded.type !== "superadministrator") {
    throw new HttpException("Invalid token type", 403);
  }
  // ---------------------------------------------------------
  // 3. Find session and validate it exists
  // ---------------------------------------------------------
  const session =
    await MyGlobal.prisma.e_commerce_mall_super_administrator_sessions.findFirst(
      {
        where: {
          id: decoded.session_id,
          super_administrator_id: decoded.id,
        },
        select: {
          id: true,
          expired_at: true,
        },
      },
    );
  if (session === null) {
    throw new HttpException("Session not found", 401);
  }
  // ---------------------------------------------------------
  // 4. Check session has not expired
  // ---------------------------------------------------------
  if (session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session has expired", 401);
  }
  // ---------------------------------------------------------
  // 5. Validate super administrator exists and is not deleted
  // ---------------------------------------------------------
  await MyGlobal.prisma.e_commerce_mall_super_administrators.findUniqueOrThrow({
    where: { id: decoded.id },
    select: { id: true },
  });
  // ---------------------------------------------------------
  // 6. Generate new JWT tokens (same session_id)
  // ---------------------------------------------------------
  const nowMs: number = Date.now();
  const accessExpiresMs: number = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs: number = nowMs + 7 * 24 * 60 * 60 * 1000;
  const nowIso: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date(nowMs).toISOString());
  const accessExpiresIso: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date(accessExpiresMs).toISOString());
  const refreshExpiresIso: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date(refreshExpiresMs).toISOString());
  const accessToken: string = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // ---------------------------------------------------------
  // 7. Update session expiration
  // ---------------------------------------------------------
  await MyGlobal.prisma.e_commerce_mall_super_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpiresMs) },
  });
  // ---------------------------------------------------------
  // 8. Fetch full super administrator record via transformer
  // ---------------------------------------------------------
  const record =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findUniqueOrThrow(
      {
        where: { id: decoded.id },
        ...ECommerceMallSuperAdministratorTransformer.select(),
      },
    );
  const transformed =
    await ECommerceMallSuperAdministratorTransformer.transform(record);
  // ---------------------------------------------------------
  // 9. Assemble and return IAuthorized response
  // ---------------------------------------------------------
  return {
    id: transformed.id,
    administrator: transformed.administrator,
    email: transformed.email,
    created_at: transformed.created_at,
    updated_at: transformed.updated_at,
    deleted_at: transformed.deleted_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    } satisfies IAuthorizationToken,
  } satisfies IECommerceMallSuperAdministrator.IAuthorized;
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
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthSuperAdministratorRefresh(props: {
//   body: IECommerceMallSuperAdministrator.IRefresh;
// }): Promise<IECommerceMallSuperAdministrator.IAuthorized> {
//   return {
//     id: ...,
//     administrator: await ECommerceMallAdministratorAtSummaryTransformer.transform(...),
//     email: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------