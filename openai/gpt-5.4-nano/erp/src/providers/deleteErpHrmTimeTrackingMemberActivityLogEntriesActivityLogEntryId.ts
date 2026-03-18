import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId(props: {
  member: MemberPayload;
  activityLogEntryId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Tenant isolation: ensure record belongs to selected organization
    const selectedOrganizationId = props.member
      .session_id as unknown as string & tags.Format<"uuid">;
    const entry =
      await tx.erp_hrm_time_tracking_activity_log_entries.findUniqueOrThrow({
        where: {
          id: props.activityLogEntryId,
          organization_id: selectedOrganizationId,
        } as any,
      });
    // delete permanently
    await tx.erp_hrm_time_tracking_activity_log_entries.delete({
      where: { id: entry.id },
    });
  });
}
