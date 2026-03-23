import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformProjectMembershipCollector } from "../collectors/HrmPlatformProjectMembershipCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMembershipTransformer } from "../transformers/HrmPlatformProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMembership.ICreate;
}): Promise<IHrmPlatformProjectMembership> {
  // Verify project exists
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { id: true, organization_id: true },
    },
  );
  // Verify employee exists and belongs to same organization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.body.employee_id },
      select: { id: true, organization_id: true },
    });
  // Validate same organization
  if (employee.organization_id !== project.organization_id) {
    throw new HttpException(
      "Employee and project must belong to the same organization",
      400,
    );
  }
  // Check for duplicate membership
  const existing =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        hrm_platform_employee_id: props.body.employee_id,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException(
      "Employee is already a member of this project",
      409,
    );
  }
  // Create membership using collector
  const created = await MyGlobal.prisma.hrm_platform_project_memberships.create(
    {
      data: await HrmPlatformProjectMembershipCollector.collect({
        body: props.body,
        hrmPlatformProjects: { id: props.projectId },
      }),
      ...HrmPlatformProjectMembershipTransformer.select(),
    },
  );
  return await HrmPlatformProjectMembershipTransformer.transform(created);
}
