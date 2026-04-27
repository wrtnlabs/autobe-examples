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
import { HrmTimeTrackingMemberAtSummaryTransformer } from "../transformers/HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingMemberSessionAtSummaryTransformer } from "../transformers/HrmTimeTrackingMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * POST /hrmTimeTracking/auth/member/join
 *
 * Register a new member account on the platform.
 * Validates email uniqueness, hashes password via bcrypt,
 * creates member + session records, and returns JWT tokens.
 */
export async function postHrmTimeTrackingAuthMemberJoin(props: {
  ip: string;
  body: IHrmTimeTrackingMember.IJoin;
}): Promise<IHrmTimeTrackingMember.IAuthorized> {
  // ---------------------------------------------------------
  // 1. Check duplicate email
  // ---------------------------------------------------------
  const existing = await MyGlobal.prisma.hrm_time_tracking_members.findUnique({
    where: { email: props.body.email },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // ---------------------------------------------------------
  // 2. Hash password
  // ---------------------------------------------------------
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);
  // ---------------------------------------------------------
  // 3. Create member record
  // ---------------------------------------------------------
  const now = new Date().toISOString();
  const memberId = v4();
  await MyGlobal.prisma.hrm_time_tracking_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.display_name,
      avatar: null,
      phone_number: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // ---------------------------------------------------------
  // 4. Create session record
  // ---------------------------------------------------------
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionId = v4();
  await MyGlobal.prisma.hrm_time_tracking_member_sessions.create({
    data: {
      id: sessionId,
      hrm_time_tracking_member_id: memberId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiresAt,
    },
  });
  // ---------------------------------------------------------
  // 5. Generate JWT tokens
  // ---------------------------------------------------------
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // ---------------------------------------------------------
  // 6. Query member using transformer for response
  // ---------------------------------------------------------
  const member =
    await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: memberId },
      ...HrmTimeTrackingMemberAtSummaryTransformer.select(),
    });
  const memberOutput =
    await HrmTimeTrackingMemberAtSummaryTransformer.transform(member);
  // ---------------------------------------------------------
  // 7. Query session using transformer for response
  // ---------------------------------------------------------
  const sessionRecord =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.findUniqueOrThrow({
      where: { id: sessionId },
      ...HrmTimeTrackingMemberSessionAtSummaryTransformer.select(),
    });
  const sessionOutput =
    await HrmTimeTrackingMemberSessionAtSummaryTransformer.transform(
      sessionRecord,
    );
  // ---------------------------------------------------------
  // 8. Build and return IAuthorized
  // ---------------------------------------------------------
  return {
    id: memberOutput.id,
    email: memberOutput.email,
    display_name: memberOutput.display_name,
    avatar: memberOutput.avatar,
    phone_number: memberOutput.phone_number,
    created_at: memberOutput.created_at,
    updated_at: memberOutput.updated_at,
    deleted_at: memberOutput.deleted_at,
    employees: [],
    sessions: [sessionOutput],
    ownedOrganizations: [],
    token,
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
// export async function postHrmTimeTrackingAuthMemberJoin(props: {
//   ip: string;
//   body: IHrmTimeTrackingMember.IJoin;
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