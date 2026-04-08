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

export async function postEcommerceMallAuthSuperAdministratorLogin(props: {
  ip: string;
  body: IEcommerceMallSuperAdministrator.ILogin;
}): Promise<IEcommerceMallSuperAdministrator.IAuthorized> {
  const admin =
    await MyGlobal.prisma.ecommerce_mall_super_administrators.findFirst({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        banned_at: true,
      },
    });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_administrator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_super_administrator_id: admin.id,
        ip: props.ip,
        created_at: new Date(),
        expired_at: accessExpires,
        href: "",
        referrer: "",
      },
    });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superAdministrator",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superAdministrator",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  const summary =
    await EcommerceMallSuperAdministratorAtSummaryTransformer.transform({
      ...admin,
    });
  const result: IEcommerceMallSuperAdministrator.IAuthorized = {
    id: admin.id,
    superAdministrator: summary,
    token,
  };
  return result;
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
// export async function postEcommerceMallAuthSuperAdministratorLogin(props: {
//   ip: string;
//   body: IEcommerceMallSuperAdministrator.ILogin;
// }): Promise<IEcommerceMallSuperAdministrator.IAuthorized> {
//   return {
//     id: ...,
//     superAdministrator: await EcommerceMallSuperAdministratorAtSummaryTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------