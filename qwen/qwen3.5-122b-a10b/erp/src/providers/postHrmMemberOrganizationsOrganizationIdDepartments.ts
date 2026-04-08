import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmDepartmentCollector } from "../collectors/HrmDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmDepartmentTransformer } from "../transformers/HrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmDepartment.ICreate;
}): Promise<IHrmDepartment> {
  // 1. Validate organization exists and is not soft-deleted
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Validate parent department if provided
  if (
    props.body.parent_department_id !== undefined &&
    props.body.parent_department_id !== null
  ) {
    const parentDepartment = await MyGlobal.prisma.hrm_departments.findFirst({
      where: {
        id: props.body.parent_department_id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        parent_department_id: true,
      },
    });
    if (parentDepartment === null) {
      throw new HttpException("Parent department not found", 404);
    }
    // Enforce one-level nesting: parent cannot have its own parent
    if (parentDepartment.parent_department_id !== null) {
      throw new HttpException(
        "Parent department cannot have a parent (one-level nesting only)",
        400,
      );
    }
  }
  // 3. Create department using collector
  const record = await MyGlobal.prisma.hrm_departments.create({
    data: await HrmDepartmentCollector.collect({
      body: props.body,
      organization: organization,
    }),
    ...HrmDepartmentTransformer.select(),
  });
  // 4. Transform and return
  return await HrmDepartmentTransformer.transform(record);
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
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmMemberOrganizationsOrganizationIdDepartments(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmDepartment.ICreate;
// }): Promise<IHrmDepartment> {
//   const record = await MyGlobal.prisma.hrm_departments.create({
//     data: await HrmDepartmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmDepartmentTransformer.select(),
//   });
//   return await HrmDepartmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------