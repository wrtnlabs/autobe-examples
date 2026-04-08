import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackProjectMemberTransformer } from "../transformers/HrmTimeTrackProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackMemberProjectsProjectIdMembersEmployeeId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackProjectMember.IUpdate;
}): Promise<IHrmTimeTrackProjectMember> {
  const data: Prisma.hrm_time_track_project_membersUpdateInput = {
    updated_at: new Date(),
    ...(props.body.role !== undefined && { role: props.body.role }),
  };
  await MyGlobal.prisma.hrm_time_track_project_members.update({
    where: {
      hrm_time_track_employee_id_hrm_time_track_project_id: {
        hrm_time_track_employee_id: props.employeeId,
        hrm_time_track_project_id: props.projectId,
      },
    },
    data,
  });
  const updated =
    await MyGlobal.prisma.hrm_time_track_project_members.findUniqueOrThrow({
      where: {
        hrm_time_track_employee_id_hrm_time_track_project_id: {
          hrm_time_track_employee_id: props.employeeId,
          hrm_time_track_project_id: props.projectId,
        },
      },
      ...HrmTimeTrackProjectMemberTransformer.select(),
    });
  return await HrmTimeTrackProjectMemberTransformer.transform(updated);
}
