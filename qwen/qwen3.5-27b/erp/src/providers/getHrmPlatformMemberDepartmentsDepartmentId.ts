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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformDepartment> {
  // Get the member's organization context from their session
  const memberSession =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUnique({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (memberSession === null) {
    throw new HttpException("Invalid session", 401);
  }
  // Query the department with all necessary relations
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  // Verify the department belongs to the member's organization
  if (
    department.organization.id !== memberSession.hrm_platform_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the department
  return await HrmPlatformDepartmentTransformer.transform(department);
}
