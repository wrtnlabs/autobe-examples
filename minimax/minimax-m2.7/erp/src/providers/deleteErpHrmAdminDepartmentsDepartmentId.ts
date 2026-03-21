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
  // Verify department exists and is not already deleted
  const department = await MyGlobal.prisma.erp_hrm_departments.findUnique({
    where: { id: props.departmentId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (!department || department.deleted_at !== null) {
    throw new HttpException("Department not found", 404);
  }
  // Execute soft delete with cascade updates in a transaction
  await MyGlobal.prisma.$transaction([
    // Clear department assignment for all employees in this department
    MyGlobal.prisma.erp_hrm_employees.updateMany({
      where: {
        erp_hrm_department_id: props.departmentId,
      },
      data: {
        erp_hrm_department_id: null,
        updated_at: new Date(),
      },
    }),
    // Convert child departments to top-level by removing parent reference
    MyGlobal.prisma.erp_hrm_departments.updateMany({
      where: {
        parent_id: props.departmentId,
      },
      data: {
        parent_id: null,
        updated_at: new Date(),
      },
    }),
    // Soft delete the department
    MyGlobal.prisma.erp_hrm_departments.update({
      where: { id: props.departmentId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
  ]);
}
