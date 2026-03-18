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
  // Get organization context from member's employee record
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  // Validate parent department hierarchy if provided
  if (props.body.parent_id) {
    const parent =
      await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
        where: { id: props.body.parent_id },
        select: {
          id: true,
          parent_id: true,
          hrm_platform_organization_id: true,
        },
      });
    // One-level hierarchy constraint: parent must be top-level (no parent of its own)
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Parent department must be a top-level department (cannot have its own parent)",
        400,
      );
    }
    // Ensure parent belongs to same organization
    if (parent.hrm_platform_organization_id !== employee.organization_id) {
      throw new HttpException(
        "Parent department must belong to the same organization",
        400,
      );
    }
  }
  // Create department using collector and transformer
  const created = await MyGlobal.prisma.hrm_platform_departments.create({
    data: await HrmPlatformDepartmentCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: employee.organization_id },
    }),
    ...HrmPlatformDepartmentTransformer.select(),
  });
  return await HrmPlatformDepartmentTransformer.transform(created);
}
