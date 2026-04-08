import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

function nowString(): string & tags.Format<"date-time"> {
  return toISOStringSafe(new Date());
}
function generateUuid(): string & tags.Format<"uuid"> {
  return v4() as string & tags.Format<"uuid">;
}
export async function postHrmAuthMemberJoin(props: {
  ip: string;
  body: IHrmMember.IJoin;
}): Promise<IHrmMember.IAuthorized> {
  const now = nowString();
  // 1. Check email uniqueness
  const existing = await MyGlobal.prisma.hrm_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Generate IDs
  const memberId = generateUuid();
  // 4. Create member record
  const member = await MyGlobal.prisma.hrm_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create email verification token (24h expiration)
  const verificationExpires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const verificationToken = generateUuid();
  await MyGlobal.prisma.hrm_member_email_verifications.create({
    data: {
      id: generateUuid(),
      hrm_member_id: member.id,
      token: verificationToken,
      email: props.body.email,
      expires_at: verificationExpires,
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Create session with JWT tokens
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 60 * 1000),
  );
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = generateUuid();
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrm_member_sessions.create({
    data: {
      id: sessionId,
      hrm_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 7. Build token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 8. Return IAuthorized
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: token,
    email_verified: false,
    organizations: [],
  } satisfies IHrmMember.IAuthorized;
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
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmAuthMemberJoin(props: {
//   ip: string;
//   body: IHrmMember.IJoin;
// }): Promise<IHrmMember.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//     email_verified: ...,
//     organizations: await ArrayUtil.asyncMap(..., (r) => HrmOrganizationAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------