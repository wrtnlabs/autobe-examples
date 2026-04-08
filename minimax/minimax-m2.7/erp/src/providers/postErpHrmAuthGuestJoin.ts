import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmOrganizationCollector } from "../collectors/ErpHrmOrganizationCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthGuestJoin(props: {
  ip: string;
  body: IErpHrmGuest.IJoin;
}): Promise<IErpHrmGuest.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password and create member
  const memberId = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date().toISOString();
  await MyGlobal.prisma.erp_hrm_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.organizationName,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create organization with member as owner
  const organization = await MyGlobal.prisma.erp_hrm_organizations.create({
    data: await ErpHrmOrganizationCollector.collect({
      body: {
        name: props.body.organizationName,
        description: undefined,
        logoUri: undefined,
        currency: props.body.currency ?? "USD",
        timezone: props.body.timezone ?? "UTC",
        fiscalStartMonth: 1,
      },
      erpHrmMembers: { id: memberId },
    }),
  });
  // 4. Query Owner role
  const ownerRole = await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      erp_hrm_organization_id: organization.id,
      name: "Owner",
      is_builtin: true,
    },
  });
  // 5. Create employee with owner role
  await MyGlobal.prisma.erp_hrm_employees.create({
    data: {
      id: v4(),
      erp_hrm_member_id: memberId,
      erp_hrm_organization_id: organization.id,
      erp_hrm_role_id: ownerRole.id,
      employment_type: "full-time",
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Generate JWT tokens and create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
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
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
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
      token_expired_at: accessExpires,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 8. Return IAuthorized response
  return {
    id: memberId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
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
// import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAuthGuestJoin(props: {
//   ip: string;
//   body: IErpHrmGuest.IJoin;
// }): Promise<IErpHrmGuest.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------