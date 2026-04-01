import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
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

export async function putErpHrmTimeMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmTimeEmployee.IUpdate;
}): Promise<IErpHrmTimeEmployee> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_role_id: true,
        erp_hrm_time_department_id: true,
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: { select: {} },
        member: { select: {} },
        role: { select: {} },
        department: { select: {} },
      },
    });
  if (employee.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.erpHrmTimeOrganizationId !== undefined &&
    props.body.erpHrmTimeOrganizationId !==
      employee.erp_hrm_time_organization_id
  ) {
    throw new HttpException("Cannot change organization", 400);
  }
  if (
    props.body.erpHrmTimeMemberId !== undefined &&
    props.body.erpHrmTimeMemberId !== employee.erp_hrm_time_member_id
  ) {
    throw new HttpException("Cannot change employee ownership", 400);
  }
  if (props.body.erpHrmTimeRoleId !== undefined) {
    const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirst({
      where: {
        id: props.body.erpHrmTimeRoleId,
        erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (role === null) throw new HttpException("Invalid role", 400);
  }
  if (props.body.erpHrmTimeDepartmentId !== undefined) {
    if (props.body.erpHrmTimeDepartmentId === null) {
      // explicit removal is allowed
    } else {
      const department =
        await MyGlobal.prisma.erp_hrm_time_departments.findFirst({
          where: {
            id: props.body.erpHrmTimeDepartmentId,
            erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (department === null)
        throw new HttpException("Invalid department", 400);
    }
  }
  if (
    props.body.employmentType !== undefined &&
    props.body.employmentType.trim().length === 0
  ) {
    throw new HttpException("Invalid employment type", 400);
  }
  if (
    props.body.status !== undefined &&
    props.body.status !== "active" &&
    props.body.status !== "deactivated"
  ) {
    throw new HttpException("Invalid employee status", 400);
  }
  await MyGlobal.prisma.erp_hrm_time_employees.update({
    where: {
      id: props.employeeId,
    },
    data: {
      ...(props.body.erpHrmTimeRoleId !== undefined && {
        erp_hrm_time_role_id: props.body.erpHrmTimeRoleId,
      }),
      ...(props.body.erpHrmTimeDepartmentId !== undefined && {
        erp_hrm_time_department_id: props.body.erpHrmTimeDepartmentId,
      }),
      ...(props.body.positionTitle !== undefined && {
        position_title: props.body.positionTitle,
      }),
      ...(props.body.employmentType !== undefined && {
        employment_type: props.body.employmentType,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
        erp_hrm_time_role_id: true,
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: { select: {} },
        member: { select: {} },
        role: { select: {} },
        department: { select: {} },
      },
    });
  const roleRecord =
    updated.erp_hrm_time_role_id === null
      ? null
      : await MyGlobal.prisma.erp_hrm_time_roles.findUniqueOrThrow({
          where: { id: updated.erp_hrm_time_role_id },
          select: {
            id: true,
            organization: { select: {} },
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        });
  const role =
    roleRecord === null
      ? {
          id: "" as string & tags.Format<"uuid">,
          organization: {},
          name: "",
          description: null,
          isBuiltin: false,
          permissions: [],
          createdAt: toISOStringSafe(updated.created_at),
          updatedAt: toISOStringSafe(updated.updated_at),
          deletedAt: null,
        }
      : {
          id: roleRecord.id,
          organization: {},
          name: roleRecord.name,
          description: roleRecord.description,
          isBuiltin: false,
          permissions: [],
          createdAt: toISOStringSafe(roleRecord.created_at),
          updatedAt: toISOStringSafe(roleRecord.updated_at),
          deletedAt:
            roleRecord.deleted_at === null
              ? null
              : toISOStringSafe(roleRecord.deleted_at),
        };
  return {
    id: updated.id,
    organization: {},
    member: {},
    role,
    department: null,
    positionTitle: updated.position_title ?? null,
    employmentType: updated.employment_type,
    status: updated.status,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
