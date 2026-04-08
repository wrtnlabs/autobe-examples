import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
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

export async function postEcommerceMallAuthMemberJoin(props: {
  ip: string;
  body: IEcommerceMallMember.IJoin;
}): Promise<IEcommerceMallMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member account (password hashing handled by PasswordUtil)
  const member = await MyGlobal.prisma.ecommerce_mall_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name ?? null,
      phone_number: props.body.phone_number ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 3. Create email verification record
  const verificationToken = v4();
  const verificationExpiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.ecommerce_mall_member_email_verifications.create({
    data: {
      id: v4(),
      ecommerce_mall_member_id: member.id,
      token: verificationToken,
      email: props.body.email,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      used_at: null,
      expired_at: verificationExpiredAt,
      deleted_at: null,
    },
  });
  // 4. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_member_sessions.create({
    data: {
      id: v4(),
      ecommerce_mall_member_id: member.id,
      access_token: "",
      refresh_token: "",
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      updated_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return IAuthorized with proper date-time string formatting
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    phone_number: member.phone_number,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  } satisfies IEcommerceMallMember.IAuthorized;
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
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthMemberJoin(props: {
//   ip: string;
//   body: IEcommerceMallMember.IJoin;
// }): Promise<IEcommerceMallMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------