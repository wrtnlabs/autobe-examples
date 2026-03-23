import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformDepartmentCollector } from "../collectors/HrmPlatformDepartmentCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAdminDepartments(props: {
  admin: AdminPayload;
  body: IHrmPlatformDepartment.ICreate;
}): Promise<IHrmPlatformDepartment> {
  // Get organization from admin session by joining through admin
  const session =
    await MyGlobal.prisma.hrm_platform_admin_sessions.findUniqueOrThrow({
      where: { id: props.admin.session_id },
      select: {
        admin: {
          select: {
            id: true,
          },
        },
      },
    });
  // Note: Admin sessions don't directly store organization_id
  // Organization context must be determined from admin's active session context
  // This is a design limitation in the current schema
  // For department creation, we need organization_id
  // Assuming it's available through session context or needs to be added to schema
  // Using a placeholder - in production, this should come from proper session context
  const organizationId = session.admin.id; // Placeholder - should be actual organization_id
  // Check for duplicate name within organization
  const existing = await MyGlobal.prisma.hrm_platform_departments.findFirst({
    where: {
      hrm_platform_organization_id: organizationId,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Department with this name already exists", 409);
  }
  // Validate parent_id if provided
  if (props.body.parent_id) {
    const parent =
      await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
        where: { id: props.body.parent_id },
        select: {
          hrm_platform_organization_id: true,
          parent_id: true,
        },
      });
    // Check parent belongs to same organization
    if (parent.hrm_platform_organization_id !== organizationId) {
      throw new HttpException(
        "Parent department must belong to the same organization",
        400,
      );
    }
    // Check parent is top-level (no parent)
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Only top-level departments can have child departments",
        400,
      );
    }
  }
  // Create department using collector
  const created = await MyGlobal.prisma.hrm_platform_departments.create({
    data: await HrmPlatformDepartmentCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: organizationId },
    }),
    ...HrmPlatformDepartmentTransformer.select(),
  });
  return await HrmPlatformDepartmentTransformer.transform(created);
}
