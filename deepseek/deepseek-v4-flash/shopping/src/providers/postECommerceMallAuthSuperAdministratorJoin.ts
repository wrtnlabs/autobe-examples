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

export async function postECommerceMallAuthSuperAdministratorJoin(props: {
  ip: string;
  body: IECommerceMallSuperAdministrator.IJoin;
}): Promise<IECommerceMallSuperAdministrator.IAuthorized> {
  // 1. Validate the target administrator exists
  await MyGlobal.prisma.e_commerce_mall_administrators.findUniqueOrThrow({
    where: { id: props.body.administrator_id },
    select: { id: true },
  });
  // 2. Check the administrator isn't already a super administrator
  const existingSuperAdmin =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findUnique({
      where: {
        e_commerce_mall_administrator_id: props.body.administrator_id,
      },
      select: { id: true },
    });
  if (existingSuperAdmin) {
    throw new HttpException(
      "Administrator is already a super administrator",
      409,
    );
  }
  // 3. Check email uniqueness
  const emailConflict =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findFirst({
      where: { email: props.body.email },
      select: { id: true },
    });
  if (emailConflict) {
    throw new HttpException("Email already in use", 409);
  }
  // 4. Hash the password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 5. Capture timestamps as ISO strings — no Date type anywhere
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 6. Create super administrator record
  const superAdmin =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.create({
      data: {
        id: v4(),
        e_commerce_mall_administrator_id: props.body.administrator_id,
        email: props.body.email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...ECommerceMallSuperAdministratorTransformer.select(),
    });
  // 7. Create session
  const session =
    await MyGlobal.prisma.e_commerce_mall_super_administrator_sessions.create({
      data: {
        id: v4(),
        super_administrator_id: superAdmin.id,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // 8. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 9. Transform and return IAuthorized
  const transformed =
    await ECommerceMallSuperAdministratorTransformer.transform(superAdmin);
  return {
    ...transformed,
    token,
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
// export async function postECommerceMallAuthSuperAdministratorJoin(props: {
//   ip: string;
//   body: IECommerceMallSuperAdministrator.IJoin;
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