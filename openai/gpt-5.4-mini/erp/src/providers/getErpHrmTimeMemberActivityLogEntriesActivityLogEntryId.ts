import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        status: "active",
      },
      select: {
        erp_hrm_time_organization_id: true,
        erp_hrm_time_member_id: true,
        is_selected_context: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const entry =
    await MyGlobal.prisma.erp_hrm_time_activity_log_entries.findFirstOrThrow({
      where: {
        id: props.activityLogEntryId,
        organization_id: membership.erp_hrm_time_organization_id,
      },
      ...ErpHrmTimeActivityLogEntryTransformer.select(),
    });
  return await ErpHrmTimeActivityLogEntryTransformer.transform(entry);
}
