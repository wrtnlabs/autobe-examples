import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformDepartmentCollector } from "../collectors/HrmPlatformDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.ICreate;
}): Promise<IHrmPlatformDepartment> {
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
  });
  if (
    props.body.parent_department_id !== null &&
    props.body.parent_department_id !== undefined
  ) {
    await MyGlobal.prisma.hrm_platform_departments.findFirstOrThrow({
      where: {
        id: props.body.parent_department_id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
    });
  }
  const record = await MyGlobal.prisma.hrm_platform_departments.create({
    data: await HrmPlatformDepartmentCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: {
        id: props.organizationId,
      },
    }),
    ...HrmPlatformDepartmentTransformer.select(),
  });
  return await HrmPlatformDepartmentTransformer.transform(record);
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
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberOrganizationsOrganizationIdDepartments(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmPlatformDepartment.ICreate;
// }): Promise<IHrmPlatformDepartment> {
//   const record = await MyGlobal.prisma.hrm_platform_departments.create({
//     data: await HrmPlatformDepartmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformDepartmentTransformer.select(),
//   });
//   return await HrmPlatformDepartmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------