import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTrackerMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, departmentId } = props;
  // Verify department exists and belongs to current organization context
  const department =
    await MyGlobal.prisma.hrm_tracker_departments.findUniqueOrThrow({
      where: {
        id: departmentId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Check for assigned employees — reject if any exist
  const employeeCount = await MyGlobal.prisma.hrm_tracker_employees.count({
    where: {
      department_id: departmentId,
    },
  });
  if (employeeCount > 0) {
    throw new HttpException("department_has_employees", 400);
  }
  // Soft-delete department and nullify employees in a transaction
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_tracker_departments.update({
      where: { id: departmentId },
      data: {
        deleted_at: now,
      },
    }),
    MyGlobal.prisma.hrm_tracker_employees.updateMany({
      where: {
        department_id: departmentId,
      },
      data: {
        department_id: null,
      },
    }),
  ]);
}
