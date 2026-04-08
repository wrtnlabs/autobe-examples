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
import { HrmRoleCollector } from "../collectors/HrmRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmRoleTransformer } from "../transformers/HrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmRole.ICreate;
}): Promise<IHrmRole> {
  const organization =
    await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
    });
  const ownership = await MyGlobal.prisma.hrm_organization_owners.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ownership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const builtInRoles: string[] = ["Owner", "Manager", "Employee"];
  if (builtInRoles.includes(props.body.name)) {
    throw new HttpException("Role name conflicts with built-in role", 409);
  }
  const existingRole = await MyGlobal.prisma.hrm_roles.findFirst({
    where: {
      organization: { id: props.organizationId },
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingRole !== null) {
    throw new HttpException("Role name already exists", 409);
  }
  const created = await MyGlobal.prisma.hrm_roles.create({
    data: await HrmRoleCollector.collect({
      body: props.body,
      hrmOrganizations: organization,
    }),
    ...HrmRoleTransformer.select(),
  });
  return await HrmRoleTransformer.transform(created);
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
// export async function postHrmMemberOrganizationsOrganizationIdRoles(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmRole.ICreate;
// }): Promise<IHrmRole> {
//   const record = await MyGlobal.prisma.hrm_roles.create({
//     data: await HrmRoleCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmRoleTransformer.select(),
//   });
//   return await HrmRoleTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------