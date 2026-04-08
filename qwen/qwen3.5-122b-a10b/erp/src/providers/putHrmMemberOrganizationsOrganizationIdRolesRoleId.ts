import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmRoleTransformer } from "../transformers/HrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IHrmRole.IUpdate;
}): Promise<IHrmRole> {
  // 1. Authorization: Verify member is organization owner
  const owner = await MyGlobal.prisma.hrm_organization_owners.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (owner === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Resource validation: Check role exists and belongs to organization
  const role = await MyGlobal.prisma.hrm_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      hrm_organization_id: props.organizationId,
    },
  });
  // 3. Check role is not soft-deleted
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  // 4. Built-in role protection
  if (role.is_builtin === true) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  // 5. Name uniqueness validation
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.hrm_roles.findFirst({
      where: {
        hrm_organization_id: props.organizationId,
        name: props.body.name,
        id: { not: props.roleId },
        deleted_at: null,
      },
    });
    if (existing !== null) {
      throw new HttpException("Role name already exists", 409);
    }
  }
  // 6. Update operation
  await MyGlobal.prisma.hrm_roles.update({
    where: { id: props.roleId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  // 7. Fetch and return updated role
  const updated = await MyGlobal.prisma.hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmRoleTransformer.select(),
  });
  return await HrmRoleTransformer.transform(updated);
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
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberOrganizationsOrganizationIdRolesRoleId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmRole.IUpdate;
// }): Promise<IHrmRole> {
//   await MyGlobal.prisma.hrm_roles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_roles.findUniqueOrThrow({
//     where: { ... },
//     ...HrmRoleTransformer.select(),
//   });
//   return await HrmRoleTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------