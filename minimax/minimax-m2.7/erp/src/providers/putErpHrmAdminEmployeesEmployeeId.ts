import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
  // 1. Find the employee to update
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // 2. Validate roleId if provided - must belong to same organization
  if (props.body.roleId !== undefined) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findUnique({
      where: { id: props.body.roleId },
      select: { id: true, erp_hrm_organization_id: true },
    });
    if (role === null) {
      throw new HttpException("Role not found", 404);
    }
    if (role.erp_hrm_organization_id !== employee.erp_hrm_organization_id) {
      throw new HttpException(
        "Role must belong to the same organization as the employee",
        400,
      );
    }
  }
  // 3. Validate departmentId if provided - must belong to same organization
  if (
    props.body.departmentId !== undefined &&
    props.body.departmentId !== null
  ) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findUnique({
      where: { id: props.body.departmentId },
      select: { id: true, erp_hrm_organization_id: true },
    });
    if (department === null) {
      throw new HttpException("Department not found", 404);
    }
    if (
      department.erp_hrm_organization_id !== employee.erp_hrm_organization_id
    ) {
      throw new HttpException(
        "Department must belong to the same organization as the employee",
        400,
      );
    }
  }
  // 4. Build update data object with only provided fields
  const updateData: Prisma.erp_hrm_employeesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.position !== undefined) {
    updateData.position = props.body.position;
  }
  if (props.body.employmentType !== undefined) {
    updateData.employment_type = props.body.employmentType;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.roleId !== undefined) {
    updateData.role = { connect: { id: props.body.roleId } };
  }
  if (props.body.departmentId !== undefined) {
    if (props.body.departmentId === null) {
      updateData.department = { disconnect: true };
    } else {
      updateData.department = { connect: { id: props.body.departmentId } };
    }
  }
  // 5. Update the employee
  await MyGlobal.prisma.erp_hrm_employees.update({
    where: { id: props.employeeId },
    data: updateData,
  });
  // 6. Fetch updated employee with all relations using transformer
  const updatedEmployee =
    await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...ErpHrmEmployeeTransformer.select(),
    });
  // 7. Transform and return
  return ErpHrmEmployeeTransformer.transform(updatedEmployee);
}
