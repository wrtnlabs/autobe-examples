import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthGuestRefresh(props: {
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  const unauthorized = (): never => {
    throw new HttpException("Invalid or expired refresh token", 401);
  };
  const decoded = await new Promise<{
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  }>((resolve, reject) => {
    jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
      (error, payload) => {
        if (error) {
          reject(new HttpException("Invalid or expired refresh token", 401));
          return;
        }
        if (
          payload === null ||
          typeof payload !== "object" ||
          Array.isArray(payload) ||
          payload.type !== "guest" ||
          typeof payload.id !== "string" ||
          typeof payload.session_id !== "string"
        ) {
          reject(new HttpException("Invalid or expired refresh token", 401));
          return;
        }
        resolve({
          id: payload.id,
          session_id: payload.session_id,
          type: "guest",
        });
      },
    );
  }).catch(() => unauthorized());
  const createdAt = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: decoded.type,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const refresh = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: decoded.type,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );
  return {
    id: decoded.id,
    token: {
      access,
      refresh,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
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
// import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postTodoAppAuthGuestRefresh(props: {
//   body: ITodoAppGuest.IRefresh;
// }): Promise<ITodoAppGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------