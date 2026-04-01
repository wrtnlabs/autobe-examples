import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingActivityLogEntryCollector } from "../collectors/ErpHrmTimeTrackingActivityLogEntryCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingActivityLogEntryTransformer } from "../transformers/ErpHrmTimeTrackingActivityLogEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberActivityLogEntries(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingActivityLogEntry.ICreate;
}): Promise<IErpHrmTimeTrackingActivityLogEntry> {
  const performedByMember =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findFirstOrThrow({
      where: { id: props.member.id, deleted_at: null },
      select: { id: true },
    });
  const organization =
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findFirstOrThrow({
      where: { id: (props.member as any).organization_id },
      select: { id: true },
    });
  const created =
    await MyGlobal.prisma.erp_hrm_time_tracking_activity_log_entries.create({
      data: await ErpHrmTimeTrackingActivityLogEntryCollector.collect({
        body: props.body,
        organization: organization,
        performedByMember: performedByMember,
      }),
      ...ErpHrmTimeTrackingActivityLogEntryTransformer.select(),
    });
  return await ErpHrmTimeTrackingActivityLogEntryTransformer.transform(created);
}
