import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
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

export async function getErpHrmTimeTrackingMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeTrackingReportDefinition> {
  // placeholder
  return await (async () => {
    const reportDefinition =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findFirstOrThrow(
        {
          where: { creator_member_id: props.member.id },
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            report_type: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            erp_hrm_time_tracking_organization_id: true,
            creator_member_id: true,
          },
        },
      );
    return {
      id: reportDefinition.id as string & tags.Format<"uuid">,
      code: reportDefinition.code,
      name: reportDefinition.name,
      description: reportDefinition.description,
      report_type: reportDefinition.report_type,
      is_active: reportDefinition.is_active,
      created_at: reportDefinition.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: reportDefinition.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: reportDefinition.deleted_at
        ? (reportDefinition.deleted_at.toISOString() as string &
            tags.Format<"date-time">)
        : null,
      organization_id:
        reportDefinition.erp_hrm_time_tracking_organization_id as string &
          tags.Format<"uuid">,
      creator_member_id: reportDefinition.creator_member_id as string &
        tags.Format<"uuid">,
      dimensions: false,
      filters: false,
    };
  })();
}
