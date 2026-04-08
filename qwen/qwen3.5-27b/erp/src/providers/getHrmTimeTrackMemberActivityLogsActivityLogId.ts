import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackActivityLog";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackActivityLogTransformer } from "../transformers/HrmTimeTrackActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberActivityLogsActivityLogId(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackActivityLog> {
  const record =
    await MyGlobal.prisma.hrm_time_track_activity_logs.findUniqueOrThrow({
      ...HrmTimeTrackActivityLogTransformer.select(),
      where: {
        id: props.activityLogId,
      },
    });
  // Verify the member has org:manage permission for the organization
  const hasPermission = await MyGlobal.prisma.hrm_time_track_employees.count({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: record.organization.id,
      deleted_at: null,
      role: {
        permissions: {
          some: {
            permission: "org:manage",
          },
        },
      },
    },
  });
  if (hasPermission === 0) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmTimeTrackActivityLogTransformer.transform(record);
}
