import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  const deleted =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.updateMany({
      where: {
        id: props.reportDefinitionId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        is_active: false,
        updated_at: now,
      },
    });
  if (deleted.count === 0) {
    throw new HttpException("Report definition not found", 404);
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.create({
    data: {
      id: v4(),
      organization_id: deleted as never,
      performed_by_member_id: deleted as never,
      action_type: "report_definition_deleted",
      target_entity_type: "report_definition",
      target_entity_id: props.reportDefinitionId,
      summary: "Report definition deleted",
      details: null,
      occurred_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
