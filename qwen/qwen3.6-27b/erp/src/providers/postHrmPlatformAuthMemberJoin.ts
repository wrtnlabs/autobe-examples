import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberJoin(props: {
  ip: string;
  body: IHrmPlatformMember.IJoin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  // 1. Check for duplicate email (exclude soft-deleted accounts)
  const existing = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create member record
  const member = await MyGlobal.prisma.hrm_platform_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      avatar_image: null,
      phone_number: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  });
  // 4. Create default organization for the member
  const organization = await MyGlobal.prisma.hrm_platform_organizations.create({
    data: {
      id: v4(),
      name: props.body.display_name,
      description: null,
      logo_uri: null,
      currency: "USD",
      timezone: "UTC",
      fiscal_start_month: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  });
  // 5. Create built-in roles (Owner, Manager, Employee)
  const nowIso = new Date().toISOString();
  await MyGlobal.prisma.hrm_platform_roles.createMany({
    data: [
      {
        id: v4(),
        hrm_platform_organization_id: organization.id,
        name: "Owner",
        built_in: true,
        description: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: v4(),
        hrm_platform_organization_id: organization.id,
        name: "Manager",
        built_in: true,
        description: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: v4(),
        hrm_platform_organization_id: organization.id,
        name: "Employee",
        built_in: true,
        description: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
  });
  // Fetch Owner role identity
  const ownerRole = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
    where: {
      hrm_platform_organization_id: organization.id,
      name: "Owner",
    },
    select: {
      id: true,
    },
  });
  // 6. Create employee record (member as Owner)
  await MyGlobal.prisma.hrm_platform_employees.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: organization.id,
      hrm_platform_member_id: member.id,
      hrm_platform_role_id: ownerRole.id,
      hrm_platform_department_id: null,
      position: null,
      employment_type: "full-time",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  });
  // 7. Create session (1h expiration)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date().toISOString(),
      expired_at: accessExpires,
    },
  });
  // 8. Generate JWT tokens
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: member.created_at.toISOString(),
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
        created_at: member.created_at.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires satisfies string & tags.Format<"date-time">,
    refreshable_until: refreshExpires satisfies string &
      tags.Format<"date-time">,
  } satisfies IAuthorizationToken;
  // 9. Return IAuthorized
  return {
    id: member.id satisfies string & tags.Format<"uuid">,
    email: member.email,
    display_name: member.display_name,
    avatar_image: member.avatar_image ?? null,
    phone_number: member.phone_number ?? null,
    created_at: member.created_at.toISOString() satisfies string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() satisfies string &
      tags.Format<"date-time">,
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
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
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformAuthMemberJoin(props: {
//   ip: string;
//   body: IHrmPlatformMember.IJoin;
// }): Promise<IHrmPlatformMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------