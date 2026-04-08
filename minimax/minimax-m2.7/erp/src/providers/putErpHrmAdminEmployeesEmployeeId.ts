import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmEmployeeTransformer } from "../transformers/ErpHrmEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminEmployeesEmployeeId(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmEmployee.IUpdate;
}): Promise<IErpHrmEmployee> {
  // Find employee by ID
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  const organizationId = employee.erp_hrm_organization_id;
  // Validate roleId if provided
  if (props.body.roleId !== undefined) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        id: props.body.roleId,
        erp_hrm_organization_id: organizationId,
      },
      select: { id: true },
    });
    if (!role) {
      throw new HttpException(
        "Role does not exist or does not belong to the organization",
        400,
      );
    }
  }
  // Validate departmentId if provided (non-null value means assignment)
  if (
    props.body.departmentId !== undefined &&
    props.body.departmentId !== null
  ) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: props.body.departmentId,
        erp_hrm_organization_id: organizationId,
      },
      select: { id: true },
    });
    if (!department) {
      throw new HttpException(
        "Department does not exist or does not belong to the organization",
        400,
      );
    }
  }
  // Build update data object with only provided fields
  const data: Prisma.erp_hrm_employeesUpdateInput = {
    updated_at: new Date(),
    ...(props.body.position !== undefined && {
      position: props.body.position ?? null,
    }),
    ...(props.body.employmentType !== undefined && {
      employment_type: props.body.employmentType,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.roleId !== undefined && {
      role: { connect: { id: props.body.roleId } },
    }),
    ...(props.body.departmentId !== undefined && {
      department:
        props.body.departmentId === null
          ? { disconnect: true }
          : { connect: { id: props.body.departmentId } },
    }),
  };
  // Update employee
  await MyGlobal.prisma.erp_hrm_employees.update({
    where: { id: props.employeeId },
    data,
  });
  // Fetch updated employee with all relations
  const updated = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    ...ErpHrmEmployeeTransformer.select(),
  });
  return await ErpHrmEmployeeTransformer.transform(updated);
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
// import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
// import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmAdminEmployeesEmployeeId(props: {
//   admin: AdminPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IErpHrmEmployee.IUpdate;
// }): Promise<IErpHrmEmployee> {
//   await MyGlobal.prisma.erp_hrm_employees.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmEmployeeTransformer.select(),
//   });
//   return await ErpHrmEmployeeTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------