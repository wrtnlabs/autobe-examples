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

export async function postHrmPlatformMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployee.ICreate;
}): Promise<IHrmPlatformEmployee> {
  // Get member's organization from their existing employee record
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_organization_id: true,
        hrm_platform_role_id: true,
      },
    },
  );
  if (!memberEmployee) {
    throw new HttpException("Member not enrolled in any organization", 403);
  }
  const organizationId = memberEmployee.hrm_platform_organization_id;
  const memberRoleId = memberEmployee.hrm_platform_role_id;
  // Validate organization exists
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findFirst({
      where: {
        id: organizationId,
        deleted_at: null,
      },
    });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // Validate member has employee:manage permission via role_permissions
  const roleHasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: memberRoleId,
        permission: {
          code: "employee:manage",
        },
      },
    });
  if (!roleHasPermission) {
    throw new HttpException(
      "Forbidden: missing employee:manage permission",
      403,
    );
  }
  // Resolve user ID
  let userId: string & tags.Format<"uuid">;
  if (props.body.hrm_platform_user_id) {
    userId = props.body.hrm_platform_user_id;
    const user = await MyGlobal.prisma.hrm_platform_members.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
    });
    if (!user) {
      throw new HttpException("User not found", 404);
    }
  } else if (props.body.email) {
    const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    });
    if (!member) {
      throw new HttpException("User not found", 404);
    }
    userId = member.id;
  } else {
    throw new HttpException(
      "Either hrm_platform_user_id or email must be provided",
      400,
    );
  }
  // Validate role exists in organization
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      id: props.body.hrm_platform_role_id,
      hrm_platform_organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (!role) {
    throw new HttpException("Role not found in organization", 404);
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
      throw new HttpException("Department not found in organization", 404);
    }
  }
  // Validate uniqueness constraint
  const existing = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_organization_id: organizationId,
      hrm_platform_user_id: userId,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(
      "Employee already exists in this organization",
      409,
    );
  }
  // Create employee record using collector
  const created = await MyGlobal.prisma.hrm_platform_employees.create({
    data: await HrmPlatformEmployeeCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: organizationId } as IEntity,
    }),
    ...HrmPlatformEmployeeTransformer.select(),
  });
  // Record activity log
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: props.member.id,
      organization_id: organizationId,
      action_type: "employee:create",
      target_entity: "employee",
      target_id: created.id,
      created_at: new Date(),
    },
  });
  return await HrmPlatformEmployeeTransformer.transform(created);
}
