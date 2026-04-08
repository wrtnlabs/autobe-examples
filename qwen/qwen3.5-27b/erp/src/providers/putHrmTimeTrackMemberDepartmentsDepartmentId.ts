import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackDepartmentTransformer } from "../transformers/HrmTimeTrackDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackDepartment.IUpdate;
}): Promise<IHrmTimeTrackDepartment> {
  // Fetch the department to verify it exists and is not soft deleted
  const department =
    await MyGlobal.prisma.hrm_time_track_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
      },
    });
  // Verify the member has organization management permission for this organization
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: department.hrm_time_track_organization_id,
      deleted_at: null,
    },
    select: {
      hrm_time_track_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if the member's role has organization management permission
  const role = await MyGlobal.prisma.hrm_time_track_roles.findUnique({
    where: {
      id: employee.hrm_time_track_role_id ?? undefined,
      hrm_time_track_organization_id: department.hrm_time_track_organization_id,
    },
    select: {
      permissions: {
        select: {
          permission: true,
        },
      },
    },
  });
  if (
    !role?.permissions.some((p) => p.permission === "organization_management")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // If name is provided, check for uniqueness within the organization
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.hrm_time_track_departments.findFirst(
      {
        where: {
          hrm_time_track_organization_id:
            department.hrm_time_track_organization_id,
          name: props.body.name,
          id: { not: props.departmentId },
          deleted_at: null,
        },
      },
    );
    if (existing) {
      throw new HttpException("Department name already exists", 409);
    }
  }
  // Update the department
  const updated = await MyGlobal.prisma.hrm_time_track_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch the updated department with full relations and transform
  const result =
    await MyGlobal.prisma.hrm_time_track_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmTimeTrackDepartmentTransformer.select(),
    });
  return await HrmTimeTrackDepartmentTransformer.transform(result);
}
