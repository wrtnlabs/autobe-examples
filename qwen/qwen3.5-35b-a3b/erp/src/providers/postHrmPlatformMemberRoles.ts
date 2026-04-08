import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformRoleCollector } from "../collectors/HrmPlatformRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberRoles(props: {
  member: MemberPayload;
  body: IHrmPlatformRole.ICreate;
}): Promise<IHrmPlatformRole> {
  // Validate role_kind is 'custom'
  if (props.body.role_kind !== "custom") {
    throw new HttpException(
      "Invalid role_kind value. Only 'custom' roles can be created.",
      400,
    );
  }
  // Get user's session with organization_id
  const sessionWithOrg =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        organization_id: true,
      },
    });
  // Throw error if organization_id is null
  if (sessionWithOrg.organization_id === null) {
    throw new HttpException(
      "Forbidden: User is not associated with any organization.",
      403,
    );
  }
  // Query organization roles with permissions to check for organization:manage permission
  const organizationRoles = await MyGlobal.prisma.hrm_platform_roles.findMany({
    where: {
      organization_id: sessionWithOrg.organization_id,
    },
    select: {
      permissions: {
        where: {
          code: "organization:manage",
        },
        select: { id: true },
      },
    },
  });
  // Verify user has organization:manage permission through organization role
  const hasPermission = organizationRoles.some(
    (role) => role.permissions.length > 0,
  );
  if (!hasPermission) {
    throw new HttpException(
      "Forbidden: You lack organization management permissions.",
      403,
    );
  }
  // Check if role name already exists in organization (case-insensitive)
  const existingRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: sessionWithOrg.organization_id,
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingRole) {
    throw new HttpException(
      "Role name already exists in this organization.",
      409,
    );
  }
  // Create the custom role using collector for data transformation
  const createdRole = await MyGlobal.prisma.hrm_platform_roles.create({
    data: await HrmPlatformRoleCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: {
        id: sessionWithOrg.organization_id,
      } satisfies IEntity,
    }),
    ...HrmPlatformRoleTransformer.select(),
  });
  // Transform and return the created role
  return await HrmPlatformRoleTransformer.transform(createdRole);
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
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberRoles(props: {
//   member: MemberPayload;
//   body: IHrmPlatformRole.ICreate;
// }): Promise<IHrmPlatformRole> {
//   const record = await MyGlobal.prisma.hrm_platform_roles.create({
//     data: await HrmPlatformRoleCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformRoleTransformer.select(),
//   });
//   return await HrmPlatformRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------