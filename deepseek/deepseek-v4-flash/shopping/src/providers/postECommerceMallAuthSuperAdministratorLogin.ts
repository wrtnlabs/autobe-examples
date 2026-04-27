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

export async function postECommerceMallAuthSuperAdministratorLogin(props: {
  ip: string;
  body: IECommerceMallSuperAdministrator.ILogin;
}): Promise<IECommerceMallSuperAdministrator.IAuthorized> {
  const superAdmin =
    await MyGlobal.prisma.e_commerce_mall_super_administrators.findFirst({
      where: { email: props.body.email, deleted_at: null },
      select: {
        ...ECommerceMallSuperAdministratorTransformer.select().select,
        password_hash: true,
      },
    });
  if (superAdmin === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (isValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const nowMs: number = Date.now();
  const accessExpiresMs: number = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs: number = nowMs + 7 * 24 * 60 * 60 * 1000;
  const nowIso: string = new Date(nowMs).toISOString();
  const accessExpiresIso: string = new Date(accessExpiresMs).toISOString();
  const refreshExpiresIso: string = new Date(refreshExpiresMs).toISOString();
  const session =
    await MyGlobal.prisma.e_commerce_mall_super_administrator_sessions.create({
      data: {
        id: v4(),
        super_administrator_id: superAdmin.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowIso,
        expired_at: accessExpiresIso,
      },
    });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superadministrator",
        id: superAdmin.id,
        session_id: session.id,
        created_at: nowIso,
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
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  } satisfies IAuthorizationToken;
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
// export async function postECommerceMallAuthSuperAdministratorLogin(props: {
//   ip: string;
//   body: IECommerceMallSuperAdministrator.ILogin;
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