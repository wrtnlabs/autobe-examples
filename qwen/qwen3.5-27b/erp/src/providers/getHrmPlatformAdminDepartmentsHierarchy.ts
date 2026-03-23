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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformDepartmentAtHierarchyTransformer } from "../transformers/HrmPlatformDepartmentAtHierarchyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformAdminDepartmentsHierarchy(props: {
  admin: AdminPayload;
}): Promise<IHrmPlatformDepartment.IHierarchy> {
  // Query all active departments across all organizations
  // Admins have platform-wide access to view all departments
  const departments = await MyGlobal.prisma.hrm_platform_departments.findMany({
    where: {
      deleted_at: null,
    },
    ...HrmPlatformDepartmentAtHierarchyTransformer.select(),
  });
  return await HrmPlatformDepartmentAtHierarchyTransformer.transform(
    departments as unknown as HrmPlatformDepartmentAtHierarchyTransformer.Payload,
  );
}
