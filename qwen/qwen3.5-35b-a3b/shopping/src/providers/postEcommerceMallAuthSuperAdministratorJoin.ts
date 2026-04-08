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

export async function postEcommerceMallAuthSuperAdministratorJoin(props: {
  ip: string;
  body: IEcommerceMallSuperAdministrator.IJoin;
}): Promise<IEcommerceMallSuperAdministrator.IAuthorized> {
  const generateUuid = (): string & tags.Format<"uuid"> =>
    v4() as string & tags.Format<"uuid">;
  const generateTimestamp = (
    msOffset: number = 0,
  ): string & tags.Format<"date-time"> => {
    const date = new Date(Date.now() + msOffset);
    return date.toISOString() as string & tags.Format<"date-time">;
  };
  const generatedTimestamp = generateTimestamp();
  // 1. Check duplicate email
  const existing =
    await MyGlobal.prisma.ecommerce_mall_super_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create super administrator account
  const superAdministrator =
    await MyGlobal.prisma.ecommerce_mall_super_administrators.create({
      data: {
        id: generateUuid(),
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        display_name: props.body.display_name,
        created_at: generateTimestamp(),
        updated_at: generateTimestamp(),
        deleted_at: null,
        banned_at: null,
      },
    });
  // 3. Create session record
  const accessExpires = generateTimestamp(60 * 60 * 1000);
  const refreshExpires = generateTimestamp(7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_administrator_sessions.create({
      data: {
        id: generateUuid(),
        ecommerce_mall_super_administrator_id: superAdministrator.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: generateTimestamp(),
        expired_at: accessExpires,
      },
    });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superAdministrator",
        id: superAdministrator.id,
        session_id: session.id,
        created_at: generateTimestamp(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superAdministrator",
        id: superAdministrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: generateTimestamp(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 5. Transform and return IAuthorized
  return {
    id: superAdministrator.id,
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
  } satisfies IEcommerceMallSuperAdministrator.IAuthorized;
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
// export async function postEcommerceMallAuthSuperAdministratorJoin(props: {
//   ip: string;
//   body: IEcommerceMallSuperAdministrator.IJoin;
// }): Promise<IEcommerceMallSuperAdministrator.IAuthorized> {
//   return {
//     id: ...,
//     superAdministrator: await EcommerceMallSuperAdministratorAtSummaryTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------