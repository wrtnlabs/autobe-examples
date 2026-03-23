import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerProjectMemberCollector } from "../collectors/HrmTrackerProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerProjectMemberTransformer } from "../transformers/HrmTrackerProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberProjectsProjectIdProjectMembers(props: {
  member: MemberPayload;
  projectId: string;
  body: IHrmTrackerProjectMember.ICreate;
}): Promise<IHrmTrackerProjectMember> {
  const employee =
    await MyGlobal.prisma.hrm_tracker_employees.findUniqueOrThrow({
      where: { id: props.body.hrm_tracker_employee_id, deleted_at: null },
      select: { id: true, status: true },
    });
  if (employee.status !== "active") {
    throw new HttpException("Employee must be active", 400);
  }
  const existing = await MyGlobal.prisma.hrm_tracker_project_members.findUnique(
    {
      where: {
        hrm_tracker_employee_id_hrm_tracker_project_id: {
          hrm_tracker_employee_id: employee.id,
          hrm_tracker_project_id: props.projectId,
        },
      },
    },
  );
  if (existing && existing.deleted_at === null) {
    return HrmTrackerProjectMemberTransformer.transform(
      await MyGlobal.prisma.hrm_tracker_project_members.findUniqueOrThrow({
        where: { id: existing.id },
        ...HrmTrackerProjectMemberTransformer.select(),
      }),
    );
  }
  const created = await MyGlobal.prisma.hrm_tracker_project_members.create({
    data: await HrmTrackerProjectMemberCollector.collect({
      body: props.body,
      hrmTrackerEmployee: employee,
      hrmTrackerProjects: { id: props.projectId } as IEntity,
    }),
    ...HrmTrackerProjectMemberTransformer.select(),
  });
  return HrmTrackerProjectMemberTransformer.transform(created);
}
