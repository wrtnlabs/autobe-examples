import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentAtHierarchyTransformer } from "../transformers/ErpHrmDepartmentAtHierarchyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberDepartmentsHierarchy(props: {
  member: MemberPayload;
}): Promise<IErpHrmDepartment.IHierarchy[]> {
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const departments = await MyGlobal.prisma.erp_hrm_departments.findMany({
    where: {
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
    },
    orderBy: { name: "asc" },
    ...ErpHrmDepartmentAtHierarchyTransformer.select(),
  });
  return await ErpHrmDepartmentAtHierarchyTransformer.transformAll(departments);
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
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberDepartmentsHierarchy(props: {
//   member: MemberPayload;
// }): Promise<IErpHrmDepartment.IHierarchy> {
//   const record = await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow({
//     ...ErpHrmDepartmentAtHierarchyTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmDepartmentAtHierarchyTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------