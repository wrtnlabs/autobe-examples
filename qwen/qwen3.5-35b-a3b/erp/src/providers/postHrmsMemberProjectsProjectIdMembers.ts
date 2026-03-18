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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsProjectMemberTransformer } from "../transformers/HrmsProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsProjectMember.ICreate;
}): Promise<IHrmsProjectMember> {
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      hrms_organization_id: true,
    },
  });
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: project.hrms_organization_id,
      },
      include: {
        organizationRole: true,
      },
    });
  if (!organizationMember.organizationRole.name.includes("project:manage")) {
    throw new HttpException("Forbidden", 403);
  }
  const employee = await MyGlobal.prisma.hrms_employees.findFirstOrThrow({
    where: {
      id: props.body.employee_id,
    },
  });
  const employeeOrganizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        employees: {
          some: {
            id: props.body.employee_id,
          },
        },
        hrms_organization_id: project.hrms_organization_id,
      },
    });
  if (!employeeOrganizationMember) {
    throw new HttpException(
      "Employee does not belong to this organization",
      409,
    );
  }
  const existing = await MyGlobal.prisma.hrms_project_members.findFirst({
    where: {
      employee_id: props.body.employee_id,
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Conflict", 409);
  }
  const created = await MyGlobal.prisma.hrms_project_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      employee: { connect: { id: props.body.employee_id } },
      project: { connect: { id: props.projectId } },
      role: props.body.role,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...HrmsProjectMemberTransformer.select(),
  });
  return await HrmsProjectMemberTransformer.transform(created);
}
