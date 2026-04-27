import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallAdministratorTransformer } from "../transformers/ECommerceMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAuthAdministratorJoin(props: {
  ip: string;
  body: IECommerceMallAdministrator.IJoin;
}): Promise<IECommerceMallAdministrator.IAuthorized> {
  // 1. Check duplicate email
  const existing =
    await MyGlobal.prisma.e_commerce_mall_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Compute ISO timestamps via ephemeral new Date() calls
  const now = Date.now();
  const accessExpiresAt = now + 60 * 60 * 1000;
  const refreshExpiresAt = now + 7 * 24 * 60 * 60 * 1000;
  const nowISO = new Date(now).toISOString();
  const accessExpiresAtISO = new Date(accessExpiresAt).toISOString();
  const refreshExpiresAtISO = new Date(refreshExpiresAt).toISOString();
  // 4. Create administrator record
  const admin = await MyGlobal.prisma.e_commerce_mall_administrators.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      created_at: nowISO,
      updated_at: nowISO,
      deleted_at: null,
    },
    ...ECommerceMallAdministratorTransformer.select(),
  });
  // 5. Create session record
  const session =
    await MyGlobal.prisma.e_commerce_mall_administrator_sessions.create({
      data: {
        id: v4(),
        administrator: { connect: { id: admin.id } },
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowISO,
        expired_at: accessExpiresAtISO,
      },
    });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAtISO,
    refreshable_until: refreshExpiresAtISO,
  };
  // 7. Transform and return IAuthorized
  const administrator =
    await ECommerceMallAdministratorTransformer.transform(admin);
  return {
    ...administrator,
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
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthAdministratorJoin(props: {
//   ip: string;
//   body: IECommerceMallAdministrator.IJoin;
// }): Promise<IECommerceMallAdministrator.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------