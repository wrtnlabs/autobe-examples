import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberJoin(props: {
  ip: string;
  body: IErpHrmMember.IJoin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Generate IDs and timestamps
  const memberId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const verificationId = v4() as string & tags.Format<"uuid">;
  const verificationToken = v4();
  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpiresIso = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresIso = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const verificationExpiresIso = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create member record
  const member = await MyGlobal.prisma.erp_hrm_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      avatar_uri: props.body.avatar_uri ?? null,
      phone: props.body.phone ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 6. Create email verification token
  await MyGlobal.prisma.erp_hrm_member_email_verifications.create({
    data: {
      id: verificationId,
      erp_hrm_member_id: memberId,
      token: verificationToken,
      expires_at: new Date(verificationExpiresIso),
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 7. Create session record
  await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_member_id: memberId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expired_at: new Date(accessExpiresIso),
      created_at: new Date(),
      expired_at: new Date(refreshExpiresIso),
    },
  });
  // 8. Return IAuthorized response
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    display_name: member.display_name,
    avatar_uri: member.avatar_uri,
    phone: member.phone,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: member.deleted_at
      ? (member.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : undefined,
    displayName: member.display_name,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAuthMemberJoin(props: {
//   ip: string;
//   body: IErpHrmMember.IJoin;
// }): Promise<IErpHrmMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------