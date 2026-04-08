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
import { HrmOrganizationAtSummaryTransformer } from "../transformers/HrmOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmAuthMemberRefresh(props: {
  body: IHrmMember.IRefresh;
}): Promise<IHrmMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
    tokenType?: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
      created_at: string;
      tokenType?: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Lookup session by session_id and member_id
  const session = await MyGlobal.prisma.hrm_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrm_member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  // 4. Validate session not expired
  const now = new Date();
  const sessionExpires = new Date(session.expired_at);
  if (sessionExpires <= now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate member exists and not deleted
  const member = await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: decoded.type,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: decoded.type,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.hrm_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // 8. Query member with employee
  const memberWithEmployee =
    await MyGlobal.prisma.hrm_members.findUniqueOrThrow({
      where: { id: decoded.id },
      include: {
        employee: true,
      },
    });
  // 9. Check email verification status
  const emailVerification =
    await MyGlobal.prisma.hrm_member_email_verifications.findFirst({
      where: {
        hrm_member_id: decoded.id,
        used_at: null,
        expires_at: { gt: now },
      },
    });
  const emailVerified = emailVerification !== null;
  // 10. Query organization with all necessary relations if employee exists
  let organization = null;
  if (memberWithEmployee.employee) {
    organization = await MyGlobal.prisma.hrm_organizations.findUnique({
      where: { id: memberWithEmployee.employee.organization_id },
      include: {
        organizationOwners: true,
        employeeSnapshots: true,
        organizationRoles: true,
        departments: true,
        employees: true,
        invitations: true,
        roles: true,
        projects: true,
      },
    });
  }
  // 11. Build response
  const response: IHrmMember.IAuthorized = {
    id: memberWithEmployee.id,
    email: memberWithEmployee.email,
    created_at: toISOStringSafe(memberWithEmployee.created_at),
    updated_at: toISOStringSafe(memberWithEmployee.updated_at),
    deleted_at: memberWithEmployee.deleted_at
      ? toISOStringSafe(memberWithEmployee.deleted_at)
      : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
    email_verified: emailVerified,
    organizations: organization
      ? [await HrmOrganizationAtSummaryTransformer.transform(organization)]
      : [],
  };
  return response;
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
// export async function postHrmAuthMemberRefresh(props: {
//   body: IHrmMember.IRefresh;
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