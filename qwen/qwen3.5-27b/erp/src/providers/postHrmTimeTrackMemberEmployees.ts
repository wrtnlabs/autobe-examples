import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackEmployeeCollector } from "../collectors/HrmTimeTrackEmployeeCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackEmployeeTransformer } from "../transformers/HrmTimeTrackEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmTimeTrackEmployee.ICreate;
}): Promise<IHrmTimeTrackEmployee> {
  // Get the organization from the member's session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  // Get the organization entity
  const organization =
    await MyGlobal.prisma.hrm_time_track_organizations.findUniqueOrThrow({
      where: {
        id: session.hrm_time_track_organization_id,
      },
      select: {
        id: true,
      },
    });
  // Create the employee record
  const record = await MyGlobal.prisma.hrm_time_track_employees.create({
    data: await HrmTimeTrackEmployeeCollector.collect({
      body: props.body,
      hrmTimeTrackOrganizations: organization,
    }),
    ...HrmTimeTrackEmployeeTransformer.select(),
  });
  return await HrmTimeTrackEmployeeTransformer.transform(record);
}
