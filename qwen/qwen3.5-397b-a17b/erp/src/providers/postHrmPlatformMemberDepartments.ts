import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformDepartmentCollector } from "../collectors/HrmPlatformDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartment.ICreate;
}): Promise<IHrmPlatformDepartment> {
  // Step 1: Get employee record to find organization and role
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  // Step 2: Verify org:manage permission
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: employee.role_id,
      },
      select: {
        permission: true,
      },
    });
  const hasManagePermission = rolePermissions.some(
    (rp) => rp.permission === "org:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check name uniqueness within organization
  const existingDepartment =
    await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        organization_id: employee.organization_id,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingDepartment) {
    throw new HttpException("Conflict", 409);
  }
  // Step 4: Validate parent department hierarchy (one-level only)
  if (
    props.body.parent_department_id !== undefined &&
    props.body.parent_department_id !== null
  ) {
    const parentDepartment =
      await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
        where: {
          id: props.body.parent_department_id,
        },
        select: {
          id: true,
          organization_id: true,
          parent_department_id: true,
        },
      });
    // Parent must belong to same organization
    if (parentDepartment.organization_id !== employee.organization_id) {
      throw new HttpException("Bad Request", 400);
    }
    // Parent must be top-level (cannot have its own parent)
    if (parentDepartment.parent_department_id !== null) {
      throw new HttpException("Bad Request", 400);
    }
  }
  // Step 5: Create department using Collector
  const created = await MyGlobal.prisma.hrm_platform_departments.create({
    data: await HrmPlatformDepartmentCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: {
        id: employee.organization_id as string & tags.Format<"uuid">,
      },
    }),
    ...HrmPlatformDepartmentTransformer.select(),
  });
  // Step 6: Transform and return
  return await HrmPlatformDepartmentTransformer.transform(created);
}
