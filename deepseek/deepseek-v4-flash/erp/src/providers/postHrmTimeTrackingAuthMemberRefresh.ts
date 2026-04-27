import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingMemberTransformer } from "../transformers/HrmTimeTrackingMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthMemberRefresh(props: {
  body: IHrmTimeTrackingMember.IRefresh;
}): Promise<IHrmTimeTrackingMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type is member
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is not expired
  const session =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        hrm_time_tracking_member_id: decoded.id,
        expired_at: { gt: new Date() },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member account is active (not soft-deleted)
  const member =
    await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: decoded.id },
      select: { id: true, deleted_at: true },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expired_at
  await MyGlobal.prisma.hrm_time_tracking_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Fetch full member with all relations using transformer
  const memberRecord =
    await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: decoded.id },
      ...HrmTimeTrackingMemberTransformer.select(),
    });
  const memberData =
    await HrmTimeTrackingMemberTransformer.transform(memberRecord);
  // 8. Construct IAuthorized response with token
  return {
    id: memberData.id,
    email: memberData.email,
    display_name: memberData.display_name,
    avatar: memberData.avatar,
    phone_number: memberData.phone_number,
    created_at: memberData.created_at,
    updated_at: memberData.updated_at,
    deleted_at: memberData.deleted_at,
    employees: memberData.employees,
    sessions: memberData.sessions,
    ownedOrganizations: memberData.ownedOrganizations,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies IHrmTimeTrackingMember.IAuthorized;
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
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingAuthMemberRefresh(props: {
//   body: IHrmTimeTrackingMember.IRefresh;
// }): Promise<IHrmTimeTrackingMember.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     display_name: ...,
//     avatar: ...,
//     phone_number: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     employees: await ArrayUtil.asyncMap(..., (r) => HrmTimeTrackingEmployeeAtSummaryTransformer.transform(r)),
//     sessions: await ArrayUtil.asyncMap(..., (r) => HrmTimeTrackingMemberSessionAtSummaryTransformer.transform(r)),
//     ownedOrganizations: await ArrayUtil.asyncMap(..., (r) => HrmTimeTrackingOrganizationAtSummaryTransformer.transform(r)),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------