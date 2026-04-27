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

export async function postHrmTimeTrackingAuthMemberLogin(props: {
  ip: string;
  body: IHrmTimeTrackingMember.ILogin;
}): Promise<IHrmTimeTrackingMember.IAuthorized> {
  const member = await MyGlobal.prisma.hrm_time_tracking_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...HrmTimeTrackingMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (member === null) {
    throw new HttpException("Invalid email or password", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (isValid === false) {
    throw new HttpException("Invalid email or password", 401);
  }
  const now: string = new Date().toISOString();
  const accessExpiredAt: string = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiredAt: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.create({
      data: {
        id: v4(),
        hrm_time_tracking_member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpiredAt,
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  } satisfies IAuthorizationToken;
  const transformed = await HrmTimeTrackingMemberTransformer.transform(member);
  return {
    ...transformed,
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
// export async function postHrmTimeTrackingAuthMemberLogin(props: {
//   ip: string;
//   body: IHrmTimeTrackingMember.ILogin;
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