import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingActivityLogEntryTransformer } from "../transformers/ErpHrmTimeTrackingActivityLogEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId(props: {
  member: MemberPayload;
  activityLogEntryId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingActivityLogEntry.IUpdate;
}): Promise<IErpHrmTimeTrackingActivityLogEntry> {
  const { activityLogEntryId, member, body } = props;
  if (
    body.details !== null &&
    body.details !== undefined &&
    body.details.length === 0
  ) {
    throw new HttpException("Invalid details", 400);
  }
  // Load target row (tenant scoping is applied by requiring the row to be owned by the caller member)
  const existing =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.findUnique(
      {
        where: { id: activityLogEntryId },
        select: {
          id: true,
          organization_id: true,
          performed_by_member_id: true,
          deleted_at: true,
        },
      },
    );
  if (existing === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (existing.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (existing.performed_by_member_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transactional update (organization_id and performed_by_member_id preserved)
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_activity_log_entries.update({
      where: { id: activityLogEntryId },
      data: {
        action_type: body.action_type,
        target_entity_type: body.target_entity_type,
        target_entity_id: body.target_entity_id,
        summary: body.summary,
        details: body.details,
        occurred_at: body.occurred_at,
        updated_at: body.occurred_at,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.findUniqueOrThrow(
      {
        where: { id: activityLogEntryId },
        ...ErpHrmTimeTrackingActivityLogEntryTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingActivityLogEntryTransformer.transform(updated);
}
