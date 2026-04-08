import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeTransformer } from "../transformers/HrmTimeTrackEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackEmployee.IUpdate;
}): Promise<IHrmTimeTrackEmployee> {
  // Find the employee and verify it exists and is not soft-deleted
  const employee =
    await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
        hrm_time_track_member_id: true,
      },
    });
  // Verify the authenticated member belongs to the same organization
  const member = await MyGlobal.prisma.hrm_time_track_members.findUniqueOrThrow(
    {
      where: {
        id: props.member.id,
        deleted_at: null,
      },
    },
  );
  // Get the member's employee record to check organization
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  if (memberEmployee === null) {
    throw new HttpException("You're not enrolled in any organization", 403);
  }
  if (
    employee.hrm_time_track_organization_id !==
    memberEmployee.hrm_time_track_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate employment_type if provided
  if (props.body.employment_type !== undefined) {
    const validEmploymentTypes = [
      "full-time",
      "part-time",
      "contractor",
      "intern",
    ];
    if (!validEmploymentTypes.includes(props.body.employment_type)) {
      throw new HttpException("Invalid employment type", 400);
    }
  }
  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = ["active", "deactivated"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status", 400);
    }
  }
  // Verify department_id belongs to the same organization if provided
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const department =
      await MyGlobal.prisma.hrm_time_track_departments.findUnique({
        where: {
          id: props.body.department_id,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_track_organization_id: true,
        },
      });
    if (department === null) {
      throw new HttpException("Department not found", 404);
    }
    if (
      department.hrm_time_track_organization_id !==
      employee.hrm_time_track_organization_id
    ) {
      throw new HttpException(
        "Department does not belong to the same organization",
        400,
      );
    }
  }
  // Verify role_id belongs to the same organization if provided
  if (props.body.role_id !== undefined && props.body.role_id !== null) {
    const role = await MyGlobal.prisma.hrm_time_track_roles.findUnique({
      where: {
        id: props.body.role_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
      },
    });
    if (role === null) {
      throw new HttpException("Role not found", 404);
    }
    if (
      role.hrm_time_track_organization_id !==
      employee.hrm_time_track_organization_id
    ) {
      throw new HttpException(
        "Role does not belong to the same organization",
        400,
      );
    }
  }
  // Update the employee record
  await MyGlobal.prisma.hrm_time_track_employees.update({
    where: { id: props.employeeId },
    data: {
      ...(props.body.position !== undefined && {
        position: props.body.position,
      }),
      ...(props.body.employment_type !== undefined && {
        employment_type: props.body.employment_type,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.department_id !== undefined && {
        department:
          props.body.department_id === null
            ? { disconnect: true }
            : { connect: { id: props.body.department_id } },
      }),
      ...(props.body.role_id !== undefined && {
        role:
          props.body.role_id === null
            ? { disconnect: true }
            : { connect: { id: props.body.role_id } },
      }),
      ...(props.body.hire_date !== undefined && {
        hire_date: new Date(props.body.hire_date),
      }),
      ...(props.body.termination_date !== undefined && {
        termination_date:
          props.body.termination_date === null
            ? null
            : new Date(props.body.termination_date),
      }),
      updated_at: new Date(),
    },
  });
  // Fetch the updated employee with transformer select
  const updated =
    await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmTimeTrackEmployeeTransformer.select(),
    });
  return await HrmTimeTrackEmployeeTransformer.transform(updated);
}
