import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerActivityLog";
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

export async function patchHrmTrackerMemberOrganizationsOrganizationIdStatusHistory(props: {
  member: MemberPayload;
  organizationId: string;
}): Promise<IPageIHrmTrackerActivityLog.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const total = await MyGlobal.prisma.hrm_tracker_activity_logs.count({
    where: {
      actorMember: {
        employees: {
          some: {
            organization_id: props.organizationId,
          },
        },
      },
    },
  });
  const data = await MyGlobal.prisma.hrm_tracker_activity_logs.findMany({
    where: {
      actorMember: {
        employees: {
          some: {
            organization_id: props.organizationId,
          },
        },
      },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      target_entity_type: true,
      target_entity_id: true,
      action_type: true,
      created_at: true,
      hrm_tracker_member_id: true,
      hrm_tracker_guest_id: true,
    },
  });
  const formattedData: IHrmTrackerActivityLog.ISummary[] = data.map((log) => ({
    id: log.id as string & tags.Format<"uuid">,
    target_entity_type: log.target_entity_type,
    target_entity_id: log.target_entity_id as string & tags.Format<"uuid">,
    action_type: log.action_type,
    created_at: toISOStringSafe(log.created_at) as string &
      tags.Format<"date-time">,
    actorMember: null,
    actorGuest: null,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: formattedData,
  } satisfies IPageIHrmTrackerActivityLog.ISummary;
}
