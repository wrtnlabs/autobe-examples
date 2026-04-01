import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsProjectMemberCollector } from "../collectors/HrmsProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsProjectMemberTransformer } from "../transformers/HrmsProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsProjectMember.ICreate;
}): Promise<IHrmsProjectMember> {
  // 1. Validate project exists
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      hrms_organization_id: true,
    },
  });
  // 2. Validate employee exists and belongs to same organization
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.body.employee_id },
    select: {
      id: true,
      organizationMember: {
        select: {
          hrms_organization_id: true,
        },
      },
    },
  });
  // Validate employee belongs to same organization as project
  if (
    employee.organizationMember.hrms_organization_id !==
    project.hrms_organization_id
  ) {
    throw new HttpException(
      "Employee does not belong to the same organization as the project",
      409,
    );
  }
  // 3. Check for duplicate membership
  const existingMembership =
    await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: props.body.employee_id,
        project_id: props.projectId,
        deleted_at: null,
      },
    });
  if (existingMembership !== null) {
    throw new HttpException(
      "Employee is already a member of this project",
      409,
    );
  }
  // 4. Create membership using collector
  const created = await MyGlobal.prisma.hrms_project_members.create({
    data: await HrmsProjectMemberCollector.collect({
      body: props.body,
      hrmsProjects: {
        id: project.id,
      } satisfies IEntity,
    }),
  });
  // 5. Fetch and transform response
  const result = await MyGlobal.prisma.hrms_project_members.findUniqueOrThrow({
    where: { id: created.id },
    ...HrmsProjectMemberTransformer.select(),
  });
  return await HrmsProjectMemberTransformer.transform(result);
}
