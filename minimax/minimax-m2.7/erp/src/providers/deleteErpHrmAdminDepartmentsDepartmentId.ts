import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmAdminDepartmentsDepartmentId(props: {
  admin: AdminPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const department = await MyGlobal.prisma.erp_hrm_departments.findUnique({
    where: { id: props.departmentId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (department === null) {
    throw new HttpException("Department not found", 404);
  }
  if (department.deleted_at !== null) {
    throw new HttpException("Department already deleted", 409);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_departments.update({
      where: { id: props.departmentId },
      data: {
        deleted_at: new Date(),
      },
    }),
    MyGlobal.prisma.erp_hrm_employees.updateMany({
      where: { erp_hrm_department_id: props.departmentId },
      data: {
        erp_hrm_department_id: null,
      },
    }),
    MyGlobal.prisma.erp_hrm_departments.updateMany({
      where: { parent_id: props.departmentId },
      data: {
        parent_id: null,
      },
    }),
  ]);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteErpHrmAdminDepartmentsDepartmentId(props: {
//   admin: AdminPayload;
//   departmentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------