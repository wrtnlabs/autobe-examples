import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackProjectTransformer } from "../transformers/HrmTimeTrackProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackProject> {
  // Get the member's organization IDs
  const memberOrgs =
    await MyGlobal.prisma.hrm_time_track_organizations.findMany({
      where: {
        employees: {
          some: {
            hrm_time_track_member_id: props.member.id,
            deleted_at: null,
          },
        },
      },
      select: {
        id: true,
      },
    });
  const memberOrgIds = memberOrgs.map((org) => org.id);
  // Query the project with organization ownership verification
  const record =
    await MyGlobal.prisma.hrm_time_track_projects.findUniqueOrThrow({
      ...HrmTimeTrackProjectTransformer.select(),
      where: {
        id: props.projectId,
        deleted_at: null,
        hrm_time_track_organization_id: {
          in: memberOrgIds,
        },
      },
    });
  return await HrmTimeTrackProjectTransformer.transform(record);
}
