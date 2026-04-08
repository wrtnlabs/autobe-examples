import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformProjectMemberCollector } from "../collectors/HrmPlatformProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMemberTransformer } from "../transformers/HrmPlatformProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMember.ICreate;
}): Promise<IHrmPlatformProjectMember> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    },
  );
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.body.hrm_platform_employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        organization_id: true,
      },
    });
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 400);
  }
  if (employee.organization_id !== project.organization_id) {
    throw new HttpException(
      "Employee does not belong to the same organization as the project",
      400,
    );
  }
  const existingMembership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: props.body.hrm_platform_employee_id,
      },
    });
  if (existingMembership !== null) {
    throw new HttpException(
      "Employee is already assigned to this project",
      409,
    );
  }
  const record = await MyGlobal.prisma.hrm_platform_project_members.create({
    data: await HrmPlatformProjectMemberCollector.collect({
      body: props.body,
      hrmPlatformProjects: { id: props.projectId },
    }),
    ...HrmPlatformProjectMemberTransformer.select(),
  });
  return await HrmPlatformProjectMemberTransformer.transform(record);
}
