import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackDepartmentCollector } from "../collectors/HrmTimeTrackDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackDepartmentTransformer } from "../transformers/HrmTimeTrackDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackMemberDepartments(props: {
  member: MemberPayload;
  body: IHrmTimeTrackDepartment.ICreate;
}): Promise<IHrmTimeTrackDepartment> {
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        organization: {
          select: {
            id: true,
          },
        },
      },
    });
  const record = await MyGlobal.prisma.hrm_time_track_departments.create({
    data: await HrmTimeTrackDepartmentCollector.collect({
      body: props.body,
      hrmTimeTrackOrganizations: session.organization,
    }),
    ...HrmTimeTrackDepartmentTransformer.select(),
  });
  return await HrmTimeTrackDepartmentTransformer.transform(record);
}
