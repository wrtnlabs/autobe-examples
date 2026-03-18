import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformEmployeeCollector } from "../collectors/HrmPlatformEmployeeCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeTransformer } from "../transformers/HrmPlatformEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.ICreate;
}): Promise<IHrmPlatformEmployee> {
  // Get organization from member's employee record
  const memberEmployeeRecord =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (!memberEmployeeRecord) {
    throw new HttpException("Organization not found", 404);
  }
  const organizationId = memberEmployeeRecord.hrm_platform_organization_id;
  // Verify employee:manage permission by checking role permissions
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                permission: {
                  select: { code: true },
                },
              },
            },
          },
        },
      },
    },
  );
  const hasEmployeeManagePermission = memberEmployee?.role.permissions.some(
    (rp) => rp.permission.code === "employee:manage",
  );
  if (!hasEmployeeManagePermission) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  // Validate roleId exists and belongs to organization
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      id: props.body.hrm_platform_role_id,
      hrm_platform_organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (!role) {
    throw new HttpException("Role not found in organization", 400);
  }
  // Validate department if provided
  if (props.body.hrm_platform_department_id) {
    const department = await MyGlobal.prisma.hrm_platform_departments.findFirst(
      {
        where: {
          id: props.body.hrm_platform_department_id,
          hrm_platform_organization_id: organizationId,
          deleted_at: null,
        },
      },
    );
    if (!department) {
      throw new HttpException("Department not found in organization", 400);
    }
  }
  // Check if member exists by email
  let userId: string & tags.Format<"uuid">;
  if (props.body.email) {
    const memberRecord = await MyGlobal.prisma.hrm_platform_members.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    });
    if (!memberRecord) {
      // Email not registered - create pending invitation via activity log
      await MyGlobal.prisma.hrm_platform_activity_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          organization_id: organizationId,
          user_id: props.member.id,
          action_type: "employee.invitation.pending",
          target_entity: "employee",
          details: JSON.stringify({
            email: props.body.email,
            organization_id: organizationId,
            role_id: props.body.hrm_platform_role_id,
            department_id: props.body.hrm_platform_department_id,
            position: props.body.position,
            employment_type: props.body.employment_type,
            status: props.body.status,
          }),
          created_at: new Date(),
        },
      });
      throw new HttpException("Pending invitation created", 202);
    }
    userId = memberRecord.id as string & tags.Format<"uuid">;
  } else if (props.body.hrm_platform_user_id) {
    const existingMember = await MyGlobal.prisma.hrm_platform_members.findFirst(
      {
        where: {
          id: props.body.hrm_platform_user_id,
          deleted_at: null,
        },
      },
    );
    if (!existingMember) {
      throw new HttpException("User not found", 404);
    }
    userId = existingMember.id as string & tags.Format<"uuid">;
  } else {
    throw new HttpException(
      "Either email or hrm_platform_user_id must be provided",
      400,
    );
  }
  // Check for existing employee record
  const existingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_organization_id: organizationId,
        hrm_platform_user_id: userId,
        deleted_at: null,
      },
    });
  if (existingEmployee) {
    throw new HttpException(
      "Employee already exists in this organization",
      409,
    );
  }
  // Check for pending invitation by querying activity logs
  if (props.body.email) {
    const pendingInvitations =
      await MyGlobal.prisma.hrm_platform_activity_logs.findMany({
        where: {
          action_type: "employee.invitation.pending",
          organization_id: organizationId,
        },
      });
    const hasPending = pendingInvitations.some((log) => {
      try {
        const detail = JSON.parse(log.details ?? "{}");
        return detail.email === props.body.email;
      } catch {
        return false;
      }
    });
    if (hasPending) {
      throw new HttpException(
        "Pending invitation already exists for this email",
        409,
      );
    }
  }
  // Create employee record using collector
  const employeeData = await HrmPlatformEmployeeCollector.collect({
    body: props.body,
    hrmPlatformOrganizations: {
      id: organizationId,
    } as IEntity,
  });
  // Override user connection with resolved userId
  const createData: Prisma.hrm_platform_employeesCreateInput = {
    ...employeeData,
    user: { connect: { id: userId } },
    organization: { connect: { id: organizationId } },
  };
  const createdEmployee = await MyGlobal.prisma.hrm_platform_employees.create({
    data: createData,
    ...HrmPlatformEmployeeTransformer.select(),
  });
  // Create activity log for employee creation
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: organizationId,
      user_id: props.member.id,
      action_type: "employee.invitation.created",
      target_entity: "employee",
      target_id: createdEmployee.id,
      details: JSON.stringify({
        employee_id: createdEmployee.id,
        user_id: userId,
        organization_id: organizationId,
        role_id: props.body.hrm_platform_role_id,
        department_id: props.body.hrm_platform_department_id,
        position: props.body.position,
        employment_type: props.body.employment_type,
        status: props.body.status,
      }),
      created_at: new Date(),
    },
  });
  return await HrmPlatformEmployeeTransformer.transform(createdEmployee);
}
