import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingRoleCollector } from "../collectors/HrmTimeTrackingRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.ICreate;
}): Promise<IHrmTimeTrackingRole> {
  // 1. Validate organization exists and is active
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, status: true },
    });
  if (organization.status !== "active") {
    throw new HttpException("Organization is not active", 400);
  }
  // 2. Validate name is not a reserved built-in role name
  const RESERVED_NAMES = ["Owner", "Manager", "Employee"];
  if (RESERVED_NAMES.some((name) => name === props.body.name)) {
    throw new HttpException("Role name is reserved for built-in roles", 400);
  }
  // 3. Validate name uniqueness within organization
  const existingRole = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      hrm_time_tracking_organization_id: props.organizationId,
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingRole !== null) {
    throw new HttpException(
      "Role name already exists in this organization",
      409,
    );
  }
  // 4. Validate permission codes are valid system permissions
  const VALID_PERMISSION_CODES = new Set([
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ]);
  const invalidCodes = props.body.permissions.filter(
    (code) => !VALID_PERMISSION_CODES.has(code),
  );
  if (invalidCodes.length > 0) {
    throw new HttpException(
      `Invalid permission codes: ${invalidCodes.join(", ")}`,
      400,
    );
  }
  // 5. Create role with permissions via collector (handles UUIDs, type='custom', timestamps, nested rolePermissions)
  const record = await MyGlobal.prisma.hrm_time_tracking_roles.create({
    data: await HrmTimeTrackingRoleCollector.collect({
      body: props.body,
      organization: { id: props.organizationId },
    }),
    ...HrmTimeTrackingRoleTransformer.select(),
  });
  // 6. Return transformed response (handles Date→ISO conversion)
  return await HrmTimeTrackingRoleTransformer.transform(record);
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
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdRoles(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingRole.ICreate;
// }): Promise<IHrmTimeTrackingRole> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_roles.create({
//     data: await HrmTimeTrackingRoleCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingRoleTransformer.select(),
//   });
//   return await HrmTimeTrackingRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------