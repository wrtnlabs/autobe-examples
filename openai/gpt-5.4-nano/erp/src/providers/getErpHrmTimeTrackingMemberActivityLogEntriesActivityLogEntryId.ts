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

export async function getErpHrmTimeTrackingMemberActivityLogEntriesActivityLogEntryId(props: {
  member: MemberPayload;
  activityLogEntryId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingActivityLogEntry> {
  await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findFirstOrThrow({
    where: {
      id: props.member.session_id,
      member: {
        id: props.member.id,
      },
    },
    select: {
      id: true,
    },
  });
  const entry =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.findUniqueOrThrow(
      {
        where: {
          id: props.activityLogEntryId,
        },
        ...ErpHrmTimeTrackingActivityLogEntryTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingActivityLogEntryTransformer.transform(entry);
}
