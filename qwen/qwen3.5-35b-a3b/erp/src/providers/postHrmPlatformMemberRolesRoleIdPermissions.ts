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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformPermissionTransformer } from "../transformers/HrmPlatformPermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IPermissionCreate;
}): Promise<IHrmPlatformPermission> {
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: { id: true, organization_id: true },
  });
  const existingPermission =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        organization_id: role.organization_id,
        code: props.body.code,
        deleted_at: null,
      },
    });
  if (existingPermission !== null) {
    throw new HttpException(
      "Permission code already exists in this organization",
      409,
    );
  }
  const created = await MyGlobal.prisma.hrm_platform_permissions.create({
    data: {
      id: v4(),
      role_id: props.roleId,
      organization_id: role.organization_id,
      code: props.body.code,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...HrmPlatformPermissionTransformer.select(),
  });
  return await HrmPlatformPermissionTransformer.transform(created);
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
// import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberRolesRoleIdPermissions(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
//   body: IHrmPlatformRole.IPermissionCreate;
// }): Promise<IHrmPlatformPermission> {
//   const record = await MyGlobal.prisma.hrm_platform_permissions.findFirstOrThrow({
//     ...HrmPlatformPermissionTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformPermissionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------