import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminOrganizationsOrganizationIdActivityLogsStatistics(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmActivityLog[]> {
  // Validate organization exists
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
    select: { id: true },
  });
  // Query aggregated statistics grouped by action_type
  const statistics = await MyGlobal.prisma.erp_hrm_activity_logs.groupBy({
    by: ["action_type"],
    where: {
      erp_hrm_organization_id: props.organizationId,
    },
    _count: {
      action_type: true,
    },
  });
  // Transform aggregated results to response DTO format
  return statistics.map(
    (stat): IErpHrmActivityLog => ({
      action_type: stat.action_type,
      count: stat._count.action_type as number & tags.Type<"int32">,
    }),
  );
}
