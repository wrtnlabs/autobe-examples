import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
  // Get member's active employee record to determine organization context
  const memberEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  // Validate role belongs to the organization
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
    where: {
      id: props.body.role_id,
      organization_id: memberEmployee.organization_id,
      deleted_at: null,
    },
  });
  // Check unique constraint: member already has employee record in this organization
  const existing = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.body.member_id,
      organization_id: memberEmployee.organization_id,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException(
      "Employee already exists in this organization",
      409,
    );
  }
  // Validate department belongs to organization if provided
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    await MyGlobal.prisma.hrm_platform_departments.findFirstOrThrow({
      where: {
        id: props.body.department_id,
        hrm_platform_organization_id: memberEmployee.organization_id,
        deleted_at: null,
      },
    });
  }
  // Validate member exists
  await MyGlobal.prisma.hrm_platform_members.findFirstOrThrow({
    where: {
      id: props.body.member_id,
      deleted_at: null,
    },
  });
  // Create employee using collector
  const created = await MyGlobal.prisma.hrm_platform_employees.create({
    data: await HrmPlatformEmployeeCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: memberEmployee.organization_id },
    }),
    ...HrmPlatformEmployeeTransformer.select(),
  });
  // Log activity
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      action_type: "employee_created",
      member: { connect: { id: props.member.id } },
      organization: { connect: { id: memberEmployee.organization_id } },
      target_entity_type: "employee",
      target_entity_id: created.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Transform and return
  return await HrmPlatformEmployeeTransformer.transform(created);
}
