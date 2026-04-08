import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

export async function postEcommerceMallAuthAdministratorLogin(props: {
  ip: string;
  body: IEcommerceMallAdministrator.ILogin;
}): Promise<IEcommerceMallAdministrator.IAuthorized> {
  // 1. Find administrator by email with password_hash
  const administrator =
    await MyGlobal.prisma.ecommerce_mall_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        display_name: true,
        grade: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });
  if (!administrator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Check if account is banned
  if (administrator.is_banned) {
    throw new HttpException("Account is banned", 401);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    administrator.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create new session
  const nowString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpiresString: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const sessionId: string & tags.Format<"uuid"> = v4();
  const session =
    await MyGlobal.prisma.ecommerce_mall_administrator_sessions.create({
      data: {
        id: sessionId,
        administrator_id: administrator.id,
        ip: props.ip,
        created_at: new Date(),
        updated_at: new Date(),
        expired_at: new Date(accessExpiresString),
        access_token: "",
        refresh_token: "",
        href: "",
        referrer: "",
      },
    });
  // 5. Generate JWT tokens
  const access = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: sessionId,
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with tokens
  await MyGlobal.prisma.ecommerce_mall_administrator_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: access,
      refresh_token: refresh,
      expired_at: new Date(refreshExpiresString),
    },
  });
  // 7. Return IAuthorized
  return {
    id: administrator.id,
    email: administrator.email,
    display_name: administrator.display_name,
    grade: typia.assert<"regular" | "super">(administrator.grade),
    is_banned: administrator.is_banned,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at: administrator.deleted_at
      ? toISOStringSafe(administrator.deleted_at)
      : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiresString,
      refreshable_until: refreshExpiresString,
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
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthAdministratorLogin(props: {
//   ip: string;
//   body: IEcommerceMallAdministrator.ILogin;
// }): Promise<IEcommerceMallAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------