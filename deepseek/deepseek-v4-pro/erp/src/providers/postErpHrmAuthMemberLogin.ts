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

export async function postErpHrmAuthMemberLogin(props: {
  ip: string;
  body: IErpHrmMember.ILogin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Find member by email — account must not be soft-deleted
  const member = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...ErpHrmMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password against stored hash
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Generate session ID and compute expiry timestamps (as ISO strings)
  const sessionId: string = v4();
  const now: string = new Date().toISOString();
  const accessExpiredAt: string = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiredAt: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 4. Issue JWT access token (short-lived) and refresh token (long-lived)
  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
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
  // 5. Persist session record — erp_hrm_organization_id starts null
  await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_member_id: member.id,
      erp_hrm_organization_id: null,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpiredAt,
    },
  });
  // 6. Build authorization token payload
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };
  // 7. Resolve organizations the member belongs to via active employee records
  const employees = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: {
      erp_hrm_member_id: member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  const distinctOrgIds: string[] = [
    ...new Set(employees.map((e) => e.erp_hrm_organization_id)),
  ];
  const organizations: IErpHrmOrganization.ISummary[] = distinctOrgIds.map(
    (orgId: string): IErpHrmOrganization.ISummary => ({
      id: orgId,
      name: orgId,
      description: null,
      logo_image: null,
    }),
  );
  // 8. Transform member profile and assemble authorized response
  const memberProfile: IErpHrmMember =
    await ErpHrmMemberTransformer.transform(member);
  return {
    ...memberProfile,
    token,
    organizations,
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
// export async function postErpHrmAuthMemberLogin(props: {
//   ip: string;
//   body: IErpHrmMember.ILogin;
// }): Promise<IErpHrmMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------