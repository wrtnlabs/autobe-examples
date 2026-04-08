import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeActivityLogEntryTransformer } from "../transformers/ErpHrmTimeActivityLogEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberActivityLogEntriesActivityLogEntryId(props: {
  member: MemberPayload;
  activityLogEntryId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeActivityLogEntry> {
  const activityLogEntry =
    await MyGlobal.prisma.erp_hrm_time_activity_log_entries.findUniqueOrThrow({
      where: {
        id: props.activityLogEntryId,
      },
      ...ErpHrmTimeActivityLogEntryTransformer.select(),
    });
  return await ErpHrmTimeActivityLogEntryTransformer.transform(
    activityLogEntry,
  );
}
