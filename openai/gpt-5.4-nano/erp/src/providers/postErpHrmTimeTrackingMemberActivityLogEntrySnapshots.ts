import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingActivityLogEntrySnapshotCollector } from "../collectors/ErpHrmTimeTrackingActivityLogEntrySnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer } from "../transformers/ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberActivityLogEntrySnapshots(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
}): Promise<IErpHrmTimeTrackingActivityLogEntrySnapshot> {
  const organizationId = props.body.erpHrmTimeTrackingOrganizationId;
  // validate tenant by checking member enrollment in that org
  const memberRecord =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findFirst({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (memberRecord === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  // Verify activity log entry exists and matches organization and performer/target
  const activityLogEntry =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.findUniqueOrThrow(
      {
        where: { id: props.body.erpHrmTimeTrackingActivityLogEntryId },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          organization_id: true,
          performed_by_member_id: true,
          action_type: true,
          target_entity_type: true,
          target_entity_id: true,
          summary: true,
          details: true,
          occurred_at: true,
        },
      },
    );
  if (activityLogEntry.organization_id !== organizationId) {
    throw new HttpException("Organization mismatch", 400);
  }
  // performer/target matching
  if (activityLogEntry.performed_by_member_id !== props.body.performerId) {
    throw new HttpException("Performer mismatch", 400);
  }
  if (
    activityLogEntry.target_entity_type !== props.body.targetEntityType ||
    activityLogEntry.target_entity_id !== props.body.targetEntityId
  ) {
    throw new HttpException("Target entity mismatch", 400);
  }
  // Rejection rule: treat action_type === "rejected" as rejection.
  // (ICreate does not contain `outcome`.)
  if (activityLogEntry.action_type === "rejected") {
    throw new HttpException(
      "Action was rejected; snapshot was not created",
      400,
    );
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshotCreateInput =
      ErpHrmTimeTrackingActivityLogEntrySnapshotCollector.collect({
        body: props.body,
      });
    return await tx.erp_hrm_time_tracking_activity_log_entry_snapshots.create({
      data: snapshotCreateInput as any,
      select:
        ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer.select().select,
    });
  });
  return await ErpHrmTimeTrackingActivityLogEntrySnapshotTransformer.transform(
    created,
  );
}
