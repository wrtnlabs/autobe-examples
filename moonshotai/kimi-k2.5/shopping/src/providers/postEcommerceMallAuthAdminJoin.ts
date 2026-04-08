import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function postEcommerceMallAuthAdminJoin(props: {
  ip: string;
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid email or password", 401);
  }
  const passwordMatch = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!passwordMatch) {
    throw new HttpException("Invalid email or password", 401);
  }
  if (admin.status !== "active") {
    throw new HttpException(
      `Account is ${admin.status}. Contact support.`,
      403,
    );
  }
  const now = toISOStringSafe();
  const accessExpires = toISOStringSafe(Date.now() + 15 * 60 * 1000);
  const refreshExpires = toISOStringSafe(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: refreshExpires,
      created_at: now,
    },
  });
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: admin.id,
    email: admin.email,
    grade: admin.grade,
    status: admin.status,
    nickname: admin.nickname,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthAdminJoin(props: {
//   ip: string;
//   body: IEcommerceMallAdmin.IJoin;
// }): Promise<IEcommerceMallAdmin.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------