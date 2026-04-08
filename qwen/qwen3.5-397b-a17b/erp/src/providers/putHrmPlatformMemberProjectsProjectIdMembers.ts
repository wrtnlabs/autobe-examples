import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMemberTransformer } from "../transformers/HrmPlatformProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMember.IUpdate;
}): Promise<IPageIHrmPlatformProjectMember> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { id: true, organization_id: true },
    },
  );
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirstOrThrow(
      {
        where: {
          hrm_platform_member_id: props.member.id,
          hrm_platform_organization_id: project.organization_id,
        },
        select: { id: true },
      },
    );
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        id: props.body.employee_id,
        organization_id: project.organization_id,
        status: "active",
      },
      select: { id: true },
    });
  const existingMember =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: props.body.employee_id,
      },
      select: { id: true, role: true },
    });
  if (existingMember) {
    await MyGlobal.prisma.hrm_platform_project_members.update({
      where: { id: existingMember.id },
      data: {
        role: props.body.role,
        updated_at: new Date(),
      },
    });
  } else {
    await MyGlobal.prisma.hrm_platform_project_members.create({
      data: {
        id: v4(),
        hrm_platform_employee_id: props.body.employee_id,
        hrm_platform_project_id: props.projectId,
        role: props.body.role,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  const records = await MyGlobal.prisma.hrm_platform_project_members.findMany({
    where: { hrm_platform_project_id: props.projectId },
    ...HrmPlatformProjectMemberTransformer.select(),
  });
  return {
    pagination: {
      current: 1,
      limit: records.length,
      records: records.length,
      pages: records.length > 0 ? 1 : 0,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformProjectMemberTransformer.transform,
    ),
  };
}
