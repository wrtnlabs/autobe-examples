import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmActivityLogDetailTransformer } from "../transformers/ErpHrmActivityLogDetailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberOrganizationsOrganizationIdActivityLogsActivityLogIdDetailsDetailId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  activityLogId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
}): Promise<IErpHrmActivityLogDetail> {
  // Verify organization membership
  const membership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        user_id: props.member.id,
        deleted_at: null,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify activity log exists within the organization
  await MyGlobal.prisma.erp_hrm_activity_logs.findUniqueOrThrow({
    where: {
      id: props.activityLogId,
      organization_id: props.organizationId,
    },
  });
  // Fetch the detail record
  const detail =
    await MyGlobal.prisma.erp_hrm_activity_log_details.findUniqueOrThrow({
      where: {
        id: props.detailId,
        activity_log_id: props.activityLogId,
      },
      ...ErpHrmActivityLogDetailTransformer.select(),
    });
  return await ErpHrmActivityLogDetailTransformer.transform(detail);
}
