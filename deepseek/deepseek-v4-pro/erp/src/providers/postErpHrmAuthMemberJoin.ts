import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmMemberTransformer } from "../transformers/ErpHrmMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberJoin(props: {
  ip: string;
  body: IErpHrmMember.IJoin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email },
    select: { id: true, deleted_at: true },
  });
  if (existing !== null && existing.deleted_at === null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  // 3. Create or reactivate member account
  let member: ErpHrmMemberTransformer.Payload;
  if (existing !== null) {
    member = await MyGlobal.prisma.erp_hrm_members.update({
      where: { id: existing.id },
      data: {
        password_hash: hashedPassword,
        display_name: props.body.display_name,
        deleted_at: null,
        updated_at: now,
      },
      ...ErpHrmMemberTransformer.select(),
    });
  } else {
    member = await MyGlobal.prisma.erp_hrm_members.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: hashedPassword,
        display_name: props.body.display_name,
        created_at: now,
        updated_at: now,
      },
      ...ErpHrmMemberTransformer.select(),
    });
  }
  // 4. Create email verification token
  const verificationToken = v4();
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.erp_hrm_member_email_verifications.create({
    data: {
      id: v4(),
      member: { connect: { id: member.id } },
      token: verificationToken,
      email: props.body.email,
      expires_at: verificationExpiresAt,
      created_at: now,
      updated_at: now,
    },
  });
  // 5. Create session and generate JWT tokens
  const sessionId = v4();
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: now.toISOString(),
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
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: sessionId,
      member: { connect: { id: member.id } },
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpiresAt,
    },
  });
  // 6. Transform and return IAuthorized
  const transformed = await ErpHrmMemberTransformer.transform(member);
  return {
    id: transformed.id,
    email: transformed.email,
    display_name: transformed.display_name,
    avatar_image: transformed.avatar_image,
    phone_number: transformed.phone_number,
    created_at: transformed.created_at,
    updated_at: transformed.updated_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    },
    organizations: [],
  } satisfies IErpHrmMember.IAuthorized;
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
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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