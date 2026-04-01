import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingProject.ICreate;
}): Promise<IErpHrmTimeTrackingProject> {
  const sessionId = props.member.session_id;
  const result =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow(
      {
        where: { id: sessionId },
        select: {
          erp_hrm_time_tracking_members_id: true,
          member: {
            select: {
              projectMemberships: {
                where: { deleted_at: null },
                select: {
                  project: {
                    select: {
                      erp_hrm_time_tracking_organization_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  return result as unknown as IErpHrmTimeTrackingProject;
}
