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
import { HrmMemberTransformer } from "../transformers/HrmMemberTransformer";
import { HrmOrganizationAtSummaryTransformer } from "../transformers/HrmOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmAuthMemberLogin(props: {
  ip: string;
  body: IHrmMember.ILogin;
}): Promise<IHrmMember.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.hrm_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...HrmMemberTransformer.select().select,
      password_hash: true,
    },
  });
  // 2. Verify member exists
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Check account is not deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account is deleted", 401);
  }
  // 5. Create new session
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.hrm_member_sessions.create({
    data: {
      id: v4(),
      hrm_member_id: member.id,
      access_token: "",
      refresh_token: "",
      ip: props.ip,
      href: null,
      referrer: null,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
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
  // 7. Update session with actual tokens
  await MyGlobal.prisma.hrm_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
    },
  });
  // 8. Get organizations the member belongs to
  const employees = await MyGlobal.prisma.hrm_employees.findMany({
    where: { user_id: member.id, deleted_at: null },
    select: {
      organization_id: true,
    },
  });
  const organizations = await ArrayUtil.asyncMap(
    employees,
    async (employee) => {
      const org = await MyGlobal.prisma.hrm_organizations.findUnique({
        where: { id: employee.organization_id, deleted_at: null },
        ...HrmOrganizationAtSummaryTransformer.select(),
      });
      if (!org) return null;
      return await HrmOrganizationAtSummaryTransformer.transform(org);
    },
  );
  // 9. Build response
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    token: token,
    email_verified: undefined,
    organizations: organizations.filter(
      (org): org is IHrmOrganization.ISummary => org !== null,
    ),
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
// export async function postHrmAuthMemberLogin(props: {
//   ip: string;
//   body: IHrmMember.ILogin;
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