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
import { ErpHrmTimeTrackingReportDefinitionTransformer } from "../transformers/ErpHrmTimeTrackingReportDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingMemberPersonalDashboard(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeTrackingReportDefinition> {
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findFirstOrThrow(
      {
        where: {
          creator_member_id: props.member.id,
          deleted_at: null,
          is_active: true,
        },
        orderBy: { updated_at: "desc" },
        ...ErpHrmTimeTrackingReportDefinitionTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingReportDefinitionTransformer.transform(
    reportDefinition,
  );
}
